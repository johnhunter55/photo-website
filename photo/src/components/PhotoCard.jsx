import React from "react";

export default function PhotoCard({
  photo,
  user,
  index,
  setPhotoToDelete,
  openLightbox,
}) {
  const isVid = isVideo(photo.image);
  const isOwnerOrAdmin = user?.verified || photo.owner === user?.id;

  return (
    <motion.div
      custom={index}
      className="masonry-item"
      variants={gridItemVariants}
    >
      {/* Delete Overlay */}
      {isOwnerOrAdmin && (
        <div
          className="delete-btn-overlay"
          onClick={(e) => {
            e.stopPropagation();
            setPhotoToDelete(photo);
          }}
        >
          <span className="material-symbols-outlined">close</span>
        </div>
      )}

      {/* Video or Image Logic */}
      {isVid ? (
        <video /* ... */ onClick={() => openLightbox(photo)} />
      ) : (
        <img /* ... */ onClick={() => openLightbox(photo)} />
      )}
    </motion.div>
  );
}
