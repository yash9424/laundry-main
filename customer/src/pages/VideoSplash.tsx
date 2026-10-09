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

// If the animation has not even reported itself ready by now, it is not going
// to be worth waiting for on this device: open the app instead.
const GIVE_UP_MS = 2500;

// Nothing may hold the splash longer than this, whatever happens.
const HARD_LIMIT_MS = ANIMATION_MS + 1500;

const VideoSplash = () => {
  const navigate = useNavigate();
  const lottie = useRef<LottieRefCurrentProps>(null);
  const movedOn = useRef(false);
  // A ref as well as state: the timers below are set up once, so reading the
  // state value inside them would always see its first-render value.
  const readyRef = useRef(false);
  const [ready, setReady] = useState(false);

  const goNext = () => {
    if (movedOn.current) return;
    movedOn.current = true;
    const customerId = localStorage.getItem("customerId");
    const authToken = localStorage.getItem("authToken");
    navigate(customerId && authToken ? "/home" : "/welcome", { replace: true });
  };

  useEffect(() => {
    // Take the native splash down immediately, on its own, gated on nothing.
    // launchAutoHide is off, so a splash nobody hides stays up for good. An
    // earlier version only hid it once the animation reported itself ready and
    // only after that promise resolved -- if either never happened the phone
    // was left on the static logo with no way forward, and the app looked like
    // it would not open at all.
    if (Capacitor.isNativePlatform()) {
      SplashScreen.hide({ fadeOutDuration: 200 }).catch(() => {});
    }

    // Two timers, and neither can be cancelled by anything the animation does.
    // The first gives up on a slow device and opens the app; the second is the
    // ceiling for the case where the animation plays but never reports that it
    // finished.
    const giveUp = setTimeout(() => {
      if (!readyRef.current) goNext();
    }, GIVE_UP_MS);
    const hardLimit = setTimeout(goNext, HARD_LIMIT_MS);

    return () => {
      clearTimeout(giveUp);
      clearTimeout(hardLimit);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Play from the first frame once the animation is actually on screen, so the
  // fly-in is seen rather than running behind the native splash. If it never
  // becomes ready the timers above have already taken care of moving on.
  useEffect(() => {
    if (!ready) return;
    lottie.current?.goToAndPlay(0, true);
  }, [ready]);

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
        onDOMLoaded={() => {
          readyRef.current = true;
          setReady(true);
        }}
        onComplete={goNext}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
};

export default VideoSplash;
