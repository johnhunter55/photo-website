import Header from "../components/Header";
import PhotoGrid from "../components/PhotoGrid";
import Lightbox from "../components/Lightbox";
import DeleteModal from "../components/DeleteModal";

export default function Gallery({ user, setUser }) {
  return (
    <div className="gallery-container">
      <Header
        user={user}
        // ... pass down other necessary props ...
      />

      <PhotoGrid
        photos={photos}
        user={user}
        setPhotoToDelete={setPhotoToDelete}
        openLightbox={(photo) => {
          enterFullscreen();
          // ... set selected photo logic
        }}
      />

      <AnimatePresence>
        {photoToDelete && (
          <DeleteModal
            confirm={confirmDelete}
            cancel={() => setPhotoToDelete(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedPhoto && (
          <Lightbox
            photo={selectedPhoto}
            changePhoto={changePhoto}
            closeLightbox={closeLightbox}
            // ... direction, etc.
          />
        )}
      </AnimatePresence>
    </div>
  );
}
