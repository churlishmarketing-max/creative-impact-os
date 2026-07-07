import CockpitClient from "./CockpitClient";

export default function Home() {
  // Props mirror the mockup's DC props (Visuals / System panel defaults).
  return <CockpitClient bootSequence showScanlines enableMotion />;
}
