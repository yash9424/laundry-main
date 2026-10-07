import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import Lottie from "lottie-react";
import splashAnimation from "@/assets/splash-animation.json";

// The animation runs 88 frames at 15fps, so just under six seconds. It used to be
// cut off by a fixed 2.5s timer, which is why it never reached its end. We now let
// it finish and keep a safety timer a little beyond its real length in case the
// completion callback never fires.
const ANIMATION_MS = Math.ceil(
  (((splashAnimation as any).op ?? 88) - ((splashAnimation as any).ip ?? 0)) /
    ((splashAnimation as any).fr ?? 15) * 1000
);
const SAFETY_MS = ANIMATION_MS + 1500;

const VideoSplash = () => {
  const navigate = useNavigate();
  const movedOn = useRef(false);
  const [animationReady, setAnimationReady] = useState(false);

  const goNext = () => {
    if (movedOn.current) return;
    movedOn.current = true;
    const customerId = localStorage.getItem("customerId");
    const authToken = localStorage.getItem("authToken");
    navigate(customerId && authToken ? "/home" : "/welcome", { replace: true });
  };

  // Only drop the native splash once our own animation has something on screen,
  // otherwise the old static logo underneath flashes through on slower phones.
  useEffect(() => {
    if (!animationReady || !Capacitor.isNativePlatform()) return;
    SplashScreen.hide({ fadeOutDuration: 200 }).catch(() => {});
  }, [animationReady]);

  useEffect(() => {
    const timer = setTimeout(goNext, SAFETY_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      onClick={goNext}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Lottie
        animationData={splashAnimation}
        loop={false}
        autoplay={true}
        onDOMLoaded={() => setAnimationReady(true)}
        onComplete={goNext}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
};

export default VideoSplash;
