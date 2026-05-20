'use client';
import { useEffect, useState } from 'react';
import ImageModal from './ImageModal';

const isVideo = (src) => /\.(mp4|webm)$/i.test(src);

export default function TopicGrid({ folder }) {
  const [images, setImages] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [columns, setColumns] = useState(4);

  useEffect(() => {
    if (!folder) return;

    fetch(`/api/images?folder=${folder}`)
      .then((res) => res.json())
      .then((data) => setImages(data.images || []));
  }, [folder]);

  const getTitle = (path) =>
    decodeURIComponent(path.split('/').pop().replace(/\.[^/.]+$/, ''));

  return (
    <>
      {/* 🔘 Grid Controls */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        {[2, 4, 8].map((n) => (
          <button
            key={n}
            onClick={() => setColumns(n)}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid #374151',
              background: columns === n ? '#2563eb' : '#111827',
              color: '#e5e7eb',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            {n} Columns
          </button>
        ))}
      </div>

      {/* 🖼 GRID */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: 20,
        }}
      >
        {images.map((src, i) => (
          <div
            key={i}
            onClick={() => {
              setActiveIndex(i);
              setModalOpen(true);
            }}
            style={{
              cursor: 'pointer',
              borderRadius: 6,
              overflow: 'hidden',
            }}
            title={getTitle(src)}
          >
            {isVideo(src) ? (
              <video
                src={src}
                muted
                preload="metadata"
                playsInline
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: 6,
                }}
              />
            ) : (
              <img
                src={src}
                alt={getTitle(src)}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: 6,
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* 🪟 MODAL */}
      {modalOpen && (
        <ImageModal
          images={images}
          activeIndex={activeIndex}
          onClose={() => {
            setModalOpen(false);
            videoRefs.current?.forEach(v => v?.pause());
          }}
        />
      )}
    </>
  );
}
