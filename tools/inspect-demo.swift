import Foundation
import AVFoundation
import AppKit
let source=CommandLine.arguments[1], out=CommandLine.arguments[2]
let asset=AVURLAsset(url: URL(fileURLWithPath:source))
let duration=CMTimeGetSeconds(asset.duration)
let tracks=asset.tracks(withMediaType:.video)
print("duration=\(duration)")
for track in tracks { print("dimensions=\(track.naturalSize), fps=\(track.nominalFrameRate)") }
let generator=AVAssetImageGenerator(asset:asset);generator.appliesPreferredTrackTransform=true
generator.requestedTimeToleranceAfter = .zero;generator.requestedTimeToleranceBefore = .zero
for second in [2,12,23,35,45,51,58,66,70,74,80,90,96,99] {
 let cg=try generator.copyCGImage(at:CMTime(seconds:Double(second),preferredTimescale:600),actualTime:nil)
 let bitmap=NSBitmapImageRep(cgImage:cg)
 try bitmap.representation(using:.png,properties:[:])!.write(to:URL(fileURLWithPath:out+"/frame-\(second).png"))
}
