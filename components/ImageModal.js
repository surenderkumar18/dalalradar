// components/ImageModal.js
import { useEffect, useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Keyboard } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";

const isVideo = (src) => /\.(mp4|webm)$/i.test(src);

export default function ImageModal({ images, activeIndex, onClose }) {
  const swiperRef = useRef(null);
  const modalRef = useRef(null);
  const [active, setActive] = useState(activeIndex);
  const [isOriginal, setIsOriginal] = useState(false);
  const thumbnailRefs = useRef([]);
  const videoRefs = useRef([]);

  /* ===============================
     ACTIVE VIDEO
    =============================== */
  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (!video) return;

      if (index === active) {
        video.play().catch(() => {});
      } else {
        video.pause();
        video.currentTime = 0;
      }
    });

    // ✅ CLEANUP ON MODAL CLOSE / UNMOUNT
    return () => {
      videoRefs.current.forEach((video) => {
        if (!video) return;
        video.pause();
        video.currentTime = 0;
      });
    };
  }, [active]);



  /* ===============================
     ESC CLOSE
  =============================== */
  useEffect(() => {
    const esc = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  /* ===============================
     CLICK OUTSIDE
  =============================== */
  useEffect(() => {
    const outside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [onClose]);

  /* ===============================
     THUMBNAIL AUTO SCROLL
  =============================== */
  useEffect(() => {
    const el = thumbnailRefs.current[active];
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [active]);

  return (
    <div
      onWheel={(e) => {
        // 🔒 DO NOT hijack wheel for video or zoomed image
        if (isOriginal || isVideo(images[active])) return;

        e.preventDefault();
        if (!swiperRef.current) return;

        e.deltaY > 0
          ? swiperRef.current.slideNext()
          : swiperRef.current.slidePrev();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.9)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* CLOSE */}
      <button
        onClick={onClose}
        style={{
          color: "#fff",
          fontSize: 24,
          position: "absolute",
          right: 20,
          top: 20,
          zIndex: 1100,
          cursor: "pointer",
          borderRadius: 36,
          padding: 6,
          width: 46,
        }}
      >
        ✕
      </button>

      <div
        ref={modalRef}
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          padding: 20,
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        {/* ===============================
            THUMBNAILS
        =============================== */}
        <div
          style={{
            width: 100,
            height: "100%",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            paddingRight: 10,
          }}
        >
          {images.map((src, i) =>
            isVideo(src) ? (
              <video
                key={i}
                ref={(el) => (thumbnailRefs.current[i] = el)}
                src={src}
                muted
                preload="metadata"
                playsInline
                onClick={() => {
                  swiperRef.current.slideTo(i);
                  setActive(i);
                  setIsOriginal(false);
                }}
                style={{
                  width: "100%",
                  height: 60,
                  objectFit: "cover",
                  borderRadius: 6,
                  cursor: "pointer",
                  border:
                    i === active
                      ? "4px solid #12ec40"
                      : "2px solid transparent",
                  opacity: 0.7,
                }}
              />
            ) : (
              <img
                key={i}
                ref={(el) => (thumbnailRefs.current[i] = el)}
                src={src}
                onClick={() => {
                  swiperRef.current.slideTo(i);
                  setActive(i);
                  setIsOriginal(false);
                }}
                style={{
                  width: "100%",
                  height: 60,
                  objectFit: "cover",
                  borderRadius: 6,
                  cursor: "pointer",
                  border:
                    i === active
                      ? "4px solid #12ec40"
                      : "2px solid transparent",
                  opacity: 0.7,
                }}
              />
            )
          )}
        </div>

        {/* ===============================
            MAIN VIEWER
        =============================== */}
        <Swiper
          onSwiper={(s) => (swiperRef.current = s)}
          navigation
          initialSlide={activeIndex}
          onSlideChange={(s) => {
            setActive(s.activeIndex);
            setIsOriginal(false);
          }}
          modules={[Navigation, Keyboard]}
          keyboard={{ enabled: true }}
          grabCursor
          simulateTouch
          allowTouchMove={!isOriginal}
          style={{ width: "100%", height: "100%" }}
        >
          {images.map((src, i) => (
            <SwiperSlide key={i}>
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {isVideo(src) ? (
                  <video
                    ref={(el) => (videoRefs.current[i] = el)}
                    src={src}
                    controls
                    playsInline
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                  />

                ) : (
                  <img
                    src={src}
                    draggable={false}
                    onDoubleClick={() => setIsOriginal(!isOriginal)}
                    style={{
                      width: isOriginal ? "auto" : "100%",
                      height: isOriginal ? "auto" : "100%",
                      objectFit: isOriginal ? "unset" : "contain",
                      cursor: isOriginal ? "zoom-out" : "zoom-in",
                    }}
                  />
                )}
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  );
}
