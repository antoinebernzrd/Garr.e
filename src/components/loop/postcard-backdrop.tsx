import { useState } from "react";
import { motion } from "framer-motion";
import pc1 from "@/assets/postcards/pc-1.jpg";
import pc2 from "@/assets/postcards/pc-2.jpg";
import pc3 from "@/assets/postcards/pc-3.jpg";
import pc4 from "@/assets/postcards/pc-4.jpg";
import pc5 from "@/assets/postcards/pc-5.jpg";
import pc6 from "@/assets/postcards/pc-6.jpg";

type Effect = "fall" | "project" | "puff";

const userCards = [pc1, pc2, pc3, pc4, pc5, pc6];
const allCards = Array.from({ length: 24 }, (_, i) => userCards[i % userCards.length]);

export function PostcardBackdrop({ children }: { children: React.ReactNode }) {
  const effects: Effect[] = ["fall", "project", "puff"];
  const [exits, setExits] = useState<Record<number, Effect>>({});
  const [gone, setGone] = useState<Set<number>>(new Set());

  const triggerExit = (i: number) => {
    if (exits[i] || gone.has(i)) return;
    const fx = effects[Math.floor(Math.random() * effects.length)];
    setExits((p) => ({ ...p, [i]: fx }));
    const removeAfter = fx === "puff" ? 2000 : fx === "fall" ? 1700 : 800;
    window.setTimeout(() => setGone((p) => new Set(p).add(i)), removeAfter);
  };

  const exitAnim = (fx: Effect) => {
    switch (fx) {
      case "fall":
        return {
          y: [0, 60, 220, 520, 1000],
          x: [0, -10, 30, -20, 60],
          rotate: [0, 25, -40, 90, 220],
          opacity: [1, 1, 1, 0.9, 0],
          transition: { duration: 1.6, ease: [0.55, 0, 0.85, 0.2] as const, times: [0, 0.15, 0.4, 0.7, 1] },
        };
      case "project":
        return {
          x: [0, 200, 1800],
          y: [0, -80, -500],
          rotate: [0, 180, 720],
          scale: [1, 1.1, 0.2],
          opacity: [1, 1, 0],
          filter: ["blur(0px)", "blur(2px)", "blur(14px)"],
          transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const, times: [0, 0.2, 1] },
        };
      case "puff":
        return {
          scale: [1, 1.15, 1.9],
          opacity: [1, 0.7, 0],
          filter: ["blur(0px)", "blur(4px)", "blur(22px)"],
          transition: { duration: 0.9, ease: "easeOut" as const, times: [0, 0.3, 1] },
        };
    }
  };

  return (
    <div className="relative w-full overflow-x-hidden bg-[#161e2e] text-white">
      <div className="pointer-events-none fixed inset-0 z-[2] bg-grain opacity-15" />

      <section className="relative h-screen w-full overflow-hidden">
        <div className="absolute inset-0 grid grid-cols-3 gap-x-4 gap-y-2 p-6 sm:grid-cols-4 md:grid-cols-6 md:gap-x-5 md:gap-y-2.5 md:p-12">
        {allCards.map((src, i) => {
          const dur = 6 + ((i * 1.7) % 5);
          const xAmp = 4 + ((i * 3) % 7);
          const yAmp = 6 + ((i * 5) % 9);
          const rotAmp = 0.6 + ((i * 0.37) % 1.4);
          const zFlip = 1.6 + ((i * 0.73) % 1.8);
          if (gone.has(i)) return <div key={i} className="aspect-[3/2]" />;
          const fx = exits[i];
          const isPuff = fx === "puff";
          const isProject = fx === "project";
          return (
            <motion.div
              key={i}
              onClick={() => triggerExit(i)}
              className="relative aspect-[3/2] cursor-pointer bg-white p-[3px] shadow-[0_10px_30px_-15px_rgba(0,0,0,0.6)] ring-1 ring-black/10"
              initial={{ opacity: 0, y: 12, scale: 0.96, zIndex: i % 2 === 0 ? 20 : 1 }}
              animate={
                fx
                  ? { ...exitAnim(fx), zIndex: 60 }
                  : {
                      opacity: 1,
                      scale: 1,
                      x: [0, xAmp, -xAmp * 0.6, xAmp * 0.4, 0],
                      y: [0, -yAmp, yAmp * 0.5, -yAmp * 0.3, 0],
                      rotate: [0, rotAmp, -rotAmp * 0.7, rotAmp * 0.4, 0],
                      zIndex: [20, 20, 1, 1, 20],
                    }
              }
              transition={
                fx
                  ? undefined
                  : {
                      opacity: { delay: i * 0.03, duration: 0.7, ease: "easeOut" },
                      scale: { delay: i * 0.03, duration: 0.7, ease: "easeOut" },
                      x: { delay: i * 0.13, duration: dur, repeat: Infinity, ease: "easeInOut" },
                      y: { delay: i * 0.11, duration: dur + 1.3, repeat: Infinity, ease: "easeInOut" },
                      rotate: { delay: i * 0.17, duration: dur + 2.1, repeat: Infinity, ease: "easeInOut" },
                      zIndex: { delay: (i * 0.37) % 2, duration: zFlip, repeat: Infinity, ease: "linear", times: [0, 0.49, 0.5, 0.99, 1] },
                    }
              }
            >
              <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />

              {isProject && (
                <motion.div
                  className="pointer-events-none absolute right-full top-1/2 h-2 w-[60vw] -translate-y-1/2 origin-right"
                  initial={{ opacity: 0, scaleX: 0 }}
                  animate={{ opacity: [0, 0.9, 0], scaleX: [0, 1, 1] }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  style={{
                    background: "linear-gradient(to left, rgba(255,255,255,0.9), rgba(255,255,255,0) 80%)",
                    filter: "blur(4px)",
                  }}
                />
              )}

              {isPuff && (
                <>
                  <motion.div
                    className="pointer-events-none absolute inset-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.9, 0] }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    style={{ background: "white" }}
                  />
                  {[...Array(22)].map((_, k) => {
                    const ang = (k / 22) * Math.PI * 2 + Math.random() * 0.5;
                    const dist = 60 + Math.random() * 110;
                    const size = 18 + Math.random() * 36;
                    const grey = 200 + Math.floor(Math.random() * 50);
                    return (
                      <motion.span
                        key={k}
                        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                        initial={{ opacity: 0, scale: 0.3 }}
                        animate={{
                          opacity: [0, 0.85, 0.6, 0],
                          scale: [0.3, 1.2, 1.8, 2.4],
                          x: Math.cos(ang) * dist,
                          y: Math.sin(ang) * dist - 30,
                          filter: ["blur(4px)", "blur(8px)", "blur(14px)", "blur(22px)"],
                        }}
                        transition={{
                          duration: 1.6 + Math.random() * 0.5,
                          delay: Math.random() * 0.15,
                          ease: "easeOut",
                        }}
                        style={{
                          width: size,
                          height: size,
                          background: `rgba(${grey},${grey},${grey},0.85)`,
                        }}
                      />
                    );
                  })}
                </>
              )}
            </motion.div>
          );
        })}
        </div>
      </section>

      <section className="relative flex min-h-screen w-full items-center justify-center px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="relative z-10 flex flex-col items-center text-center"
        >
          <h1
            className="select-none text-[4vw] leading-[0.7] tracking-tight text-white sm:text-[2.75rem] md:text-[3rem]"
            style={{ fontFamily: '"Geist", ui-sans-serif, sans-serif', letterSpacing: "0.02em", fontWeight: 600 }}
          >
            Garr.e
          </h1>
          <div className="relative z-10 mt-8 w-full max-w-sm">{children}</div>
        </motion.div>
      </section>
    </div>
  );
}
