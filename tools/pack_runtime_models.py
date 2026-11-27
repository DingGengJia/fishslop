"""Compact the four embedded-buffer runtime GLBs after Blender export. Requires Pillow."""
import io
import json
from pathlib import Path
import struct

from PIL import Image


def pack_model(path):
    data = path.read_bytes()
    magic, version, length, json_length, json_type = struct.unpack_from("<4s4I", data)
    if (magic, version, length, json_type) != (b"glTF", 2, len(data), 0x4E4F534A):
        raise ValueError(f"Expected a glTF 2 binary asset: {path}")
    doc = json.loads(data[20:20 + json_length])
    bin_size, bin_type = struct.unpack_from("<I4s", data, 20 + json_length)
    source = data[28 + json_length:]
    if bin_type != b"BIN\0" or len(source) != bin_size or len(doc["buffers"]) != 1:
        raise ValueError(f"Expected one embedded binary buffer: {path}")
    textures = {image["bufferView"]: image for image in doc.get("images", [])}
    packed = bytearray()
    offsets = {}
    for index, view in enumerate(doc["bufferViews"]):
        start = view.get("byteOffset", 0)
        payload = source[start:start + view["byteLength"]]
        image = textures.get(index)
        if image and image["mimeType"] == "image/png":
            with Image.open(io.BytesIO(payload)) as original:
                rgba = original.convert("RGBA")
                if rgba.getchannel("A").getextrema() == (255, 255):
                    output = io.BytesIO()
                    rgba.convert("RGB").save(output, "JPEG", quality=94, subsampling=0, optimize=True)
                    if output.tell() < len(payload):
                        payload = output.getvalue()
                        image["mimeType"] = "image/jpeg"
        if payload not in offsets:
            offsets[payload] = len(packed)
            packed.extend(payload)
            packed.extend(b"\0" * (-len(packed) % 4))
        view.update(byteOffset=offsets[payload], byteLength=len(payload))
    doc["buffers"][0]["byteLength"] = len(packed)
    metadata = json.dumps(doc, separators=(",", ":")).encode()
    metadata += b" " * (-len(metadata) % 4)
    header = struct.pack("<4s4I", magic, version, 28 + len(metadata) + len(packed),
                         len(metadata), json_type)
    path.write_bytes(header + metadata + struct.pack("<I4s", len(packed), bin_type) + packed)
    print(f"{path.name}: {len(data):,} → {path.stat().st_size:,} bytes")


if __name__ == "__main__":
    models = Path(__file__).resolve().parents[1] / "public/models"
    for species in ("submarine", "goldfish", "azure", "orchid"):
        pack_model(models / f"{species}-lite.glb")
