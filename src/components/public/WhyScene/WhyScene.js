import "@/components/public/WhyScene/WhyScene.css";

export default function WhyScene({ icon, index }) {
  return (
    <div className="scene" aria-hidden="true">
      <div className="scene-grid"></div>
      <div className="scene-glow"></div>
      <div className="scene-orbit scene-orbit-a"><i></i></div>
      <div className="scene-orbit scene-orbit-b"><i></i></div>
      <span className="scene-spark scene-spark-a"></span>
      <span className="scene-spark scene-spark-b"></span>
      <span className="scene-spark scene-spark-c"></span>
      <div className="scene-floor"></div>
      <div className="scene-tile">
        <span className="scene-face"><i className={icon}></i></span>
      </div>
      <span className="scene-index">{String(index).padStart(2, "0")}</span>
    </div>
  );
}
