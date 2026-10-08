import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import Lottie, { type LottieRefCurrentProps } from "lottie-react";
import splashAnimation from "@/assets/splash-animation.json";

// The animation runs 88 frames at 15fps, so just under six seconds.
const ANIMATION_MS = Math.ceil(
  (((splashAnimation as any).op ?? 88) - ((splashAnimation as any).ip ?? 0)) /
    ((splashAnimation as any).fr ?? 15) * 1000
);

// If the animation has not reported itself ready by now, stop waiting for it.
const LOAD_TIMEOUT_MS = 6000;

const VideoSplash = () => {
  const navigate = useNavigate();
  const lottie = useRef<LottieRefCurrentProps>(null);
  const movedOn = useRef(false);
  const started = useRef(false);
  const [ready, setReady] = useState(false);

  const goNext = () => {
    if (movedOn.current) return;
    movedOn.current = true;
    const customerId = localStorage.getItem("customerId");
    const authToken = localStorage.getItem("authToken");
    navigate(customerId && authToken ? "/home" : "/welcome", { replace: true });
  };

  const hideNativeSplash = () =>
    Capacitor.isNativePlatform()
      ? SplashScreen.hide({ fadeOutDuration: 400 }).catch(() => {})
      : Promise.resolve();

  // Take the native splash down first, and only then start the motion graphic.
  // It used to autoplay as soon as it mounted, so the whole fly-in ran behind
  // the native splash while the web view was still warming up. By the time that
  // splash lifted, the animation had already reached its closing frames, which
  // hold still -- which is exactly why it looked like the logo never animated.
  useEffect(() => {
    if (!ready || started.current) return;
    started.current = true;
    let safety: ReturnType<typeof setTimeout>;
    hideNativeSplash().then(() => {
      lottie.current?.goToAndPlay(0, true);
      // onComplete normally moves us on; this only covers it not firing.
      safety = setTimeout(goNext, ANIMATION_MS + 1500);
    });
    return () => clearTimeout(safety);
  }, [ready]);

  // Backstop. launchAutoHide is off, so a native splash nobody hides stays on
  // screen for good -- if the animation never loads we still have to get out.
  useEffect(() => {
    const bail = setTimeout(() => {
      if (started.current) return;
      hideNativeSplash().then(goNext);
    }, LOAD_TIMEOUT_MS);
    return () => clearTimeout(bail);
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
        lottieRef={lottie}
        animationData={splashAnimation}
        loop={false}
        autoplay={false}
        onDOMLoaded={() => setReady(true)}
        onComplete={goNext}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
};

export default VideoSplash;
