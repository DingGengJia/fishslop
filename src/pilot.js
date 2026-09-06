// Camera heading controls travel axes; the hull follows travel independently.
// Kept in the fixed-step simulation so attitude is testable and frame-rate independent.
export const angleDelta = (from, to) => Math.atan2(Math.sin(to-from), Math.cos(to-from));
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const damp = (from, to, rate, dt) => from + (to-from)*(1-Math.exp(-rate*dt));

export function updateAttitude(sub, dt) {
  sub.heading ??= sub.yaw;
  sub.trim ??= sub.pitch;
  sub.bank ??= 0;
  sub.lastLookYaw ??= sub.yaw;
  sub.course ??= sub.heading;
  const horizontal = Math.hypot(sub.vx, sub.vz);
  const moving = Math.hypot(horizontal, sub.vy) > .18;
  const looking = Math.abs(angleDelta(sub.lastLookYaw, sub.yaw)) > .00001;
  // Keep the last heading when hovering. An explicit camera turn re-aims the hull.
  if(horizontal > .18) sub.course=Math.atan2(-sub.vx,-sub.vz);
  else if(looking) sub.course=sub.yaw;
  const desiredYaw=sub.course;
  const step = clamp(angleDelta(sub.heading, desiredYaw)*(1-Math.exp(-dt*6)), -2.4*dt, 2.4*dt);
  sub.heading = angleDelta(0, sub.heading + step);
  const desiredPitch = moving ? clamp(Math.atan2(sub.vy, horizontal), -1.05, 1.05) : sub.pitch;
  sub.trim = damp(sub.trim, desiredPitch, 4.5, dt);
  // Positive yaw is a left turn, so bank the port side down while turning.
  const desiredBank = horizontal > .4 ? clamp(step/Math.max(dt,.0001)*.18, -.32, .32) : 0;
  sub.bank = damp(sub.bank, desiredBank, 7, dt);
  sub.lastLookYaw = sub.yaw;
}

export function hullDirection(sub) {
  const yaw = sub.heading ?? sub.yaw, pitch = sub.trim ?? sub.pitch;
  return { x: -Math.sin(yaw)*Math.cos(pitch), y: Math.sin(pitch), z: -Math.cos(yaw)*Math.cos(pitch) };
}
