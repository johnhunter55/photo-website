import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import PocketBase from "pocketbase";
import { motion, AnimatePresence } from "framer-motion";
import Auth from "./Auth";
import "./App.css";
import AvatarUpload from "./assets/AvatarUpload.jsx";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import axios from "axios";

const pb = new PocketBase("https://model.john5bb.com");
pb.autoCancellation(false);

const variants = {
  enter: (direction) => ({
    x: direction > 0 ? 1000 : -1000,
    opacity: 0,
    scale: 0.95,
  }),
  center: { zIndex: 1, x: 0, opacity: 1, scale: 1 },
  exit: (direction) => ({
    zIndex: 0,
    x: direction < 0 ? 1000 : -1000,
    opacity: 0,
    scale: 0.95,
  }),
};

const gridContainerVariants = {
  hidden: {},
  show: {},
};

const gridItemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: (i) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.05,
    },
  }),
};

const enterFullscreen = () => {
  if (window.innerWidth > 768) return;
  const elem = document.documentElement;
  if (elem.requestFullscreen) elem.requestFullscreen().catch(() => {});
  else if (elem.webkitRequestFullscreen)
    elem.webkitRequestFullscreen().catch(() => {});
};

const exitFullscreen = () => {
  if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
  else if (document.webkitExitFullscreen)
    document.webkitExitFullscreen().catch(() => {});
};

const swipeConfidenceThreshold = 2000;
const swipePower = (offset, velocity) => Math.abs(offset) * velocity;

const isVideo = (filename) => /\.(mp4|mov|webm|ogg|mkv)$/i.test(filename);

const ProgressiveImage = ({ photo, direction, onDragEnd, onClose }) => {
  const [loaded, setLoaded] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const isZoomedRef = useRef(false);
  const imgRef = useRef(null);
  const videoRef = useRef(null);

  const isVid = isVideo(photo.image);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    if (imgRef.current && imgRef.current.complete) {
      setLoaded(true);
    }
    if (videoRef.current && videoRef.current.readyState >= 3) {
      setLoaded(true);
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const thumbUrl = pb.files.getURL(photo, photo.image, { thumb: "480x0" });
  const fullUrl = pb.files.getURL(photo, photo.image);

  return (
    <motion.div
      key={photo.id}
      custom={direction}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{
        x: { type: "spring", stiffness: 400, damping: 40 },
        opacity: { duration: 0.2 },
      }}
      drag={isZoomed ? false : true}
      dragDirectionLock={false}
      dragSnapToOrigin={true}
      dragElastic={1}
      dragMomentum={false}
      onDragEnd={(e, info) => {
        if (isZoomedRef.current) return;
        onDragEnd(e, info);
      }}
      className="progressive-wrapper"
      style={{
        position: "absolute",
        width: "100%",
        height: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        touchAction: "none",
      }}
    >
      {!loaded && (
        <div style={{ position: "absolute", zIndex: 10 }}>
          <div className="spinner"></div>
        </div>
      )}

      <div className="responsive-container">
        <img
          src={thumbUrl}
          alt=""
          className="lightbox-thumb lightbox-img-shared"
          style={{ opacity: loaded ? 0 : 1 }}
        />

        {isVid ? (
          <video
            ref={videoRef}
            src={fullUrl}
            className="lightbox-img-shared"
            controls
            autoPlay
            playsInline
            onLoadedData={() => setLoaded(true)}
            style={{
              opacity: loaded ? 1 : 0,
              transition: "opacity 0.3s ease-in-out",
              gridArea: "1/1",
              zIndex: 2,
              maxWidth: "100%",
              maxHeight: "100%",
            }}
          />
        ) : (
          <TransformWrapper
            initialScale={1}
            minScale={0.5}
            maxScale={5}
            centerOnInit={true}
            wheel={{ step: 1 }}
            doubleClick={{ mode: isZoomed ? "reset" : "zoomIn", step: 2 }}
            panning={{ disabled: !isZoomed, velocityDisabled: true }}
            onZoomStart={() => {
              setIsZoomed(true);
              isZoomedRef.current = true;
            }}
            onPanningStart={() => {
              setIsZoomed(true);
              isZoomedRef.current = true;
            }}
            onTransformed={(ref) => {
              const scale = ref.state.scale;
              if (scale < 0.65) {
                onClose && onClose();
                return;
              }
              const zoomed = scale > 1.01;
              setIsZoomed(zoomed);
              isZoomedRef.current = zoomed;
            }}
            onZoomStop={(ref) => {
              if (ref.state.scale < 1 && ref.state.scale >= 0.65) {
                ref.resetTransform();
              }
            }}
          >
            <TransformComponent
              wrapperClass="react-transform-wrapper"
              contentClass="react-transform-component"
            >
              <img
                ref={imgRef}
                src={fullUrl}
                alt=""
                className="lightbox-img-shared"
                onLoad={() => setLoaded(true)}
                style={{
                  opacity: loaded ? 1 : 0,
                  transition: "opacity 0.3s ease-in-out",
                }}
              />
            </TransformComponent>
          </TransformWrapper>
        )}
      </div>
    </motion.div>
  );
};

// --- MAIN APP ---
function App() {
  const [user, setUser] = useState(
    pb.authStore.isValid ? pb.authStore.model : null,
  );
  const [photos, setPhotos] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [[page, direction], setPage] = useState([0, 0]);
  const [userList, setUserList] = useState([]);
  const [photoToDelete, setPhotoToDelete] = useState(null);
  const [viewingUser, setViewingUser] = useState(
    pb.authStore.isValid && pb.authStore.model ? pb.authStore.model.id : null,
  );
  const [uploadProgress, setUploadProgress] = useState(0);
  const [numCols, setNumCols] = useState(3);

  useEffect(() => {
    const handleResize = () => setNumCols(window.innerWidth <= 768 ? 2 : 3);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const [filterOpen, setFilterOpen] = useState(false);

  const handleSelectUser = (id) => {
    setViewingUser(id);
    setFilterOpen(false);
  };

  const closeLightbox = useCallback(() => {
    exitFullscreen();
    setTimeout(() => setSelectedPhoto(null), 50);
  }, []);

  const changePhoto = useCallback(
    (newDir) => {
      if (!selectedPhoto) return;
      const idx = photos.findIndex((p) => p.id === selectedPhoto.id);
      let next = idx + newDir;
      if (next < 0) next = photos.length - 1;
      if (next >= photos.length) next = 0;
      setPage((p) => [p[0] + newDir, newDir]);
      setSelectedPhoto(photos[next]);
    },
    [photos, selectedPhoto],
  );

  useEffect(() => {
    async function init() {
      if (pb.authStore.isValid && pb.authStore.model) {
        try {
          const u = await pb.collection("users").getOne(pb.authStore.model.id);
          setUser(u);
        } catch (err) {
          console.error("Auth check failed:", err);
          pb.authStore.clear();
          setUser(null);
        }
      } else {
        pb.authStore.clear();
        setUser(null);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (!user) return;
    let isCancelled = false;
    async function loadData() {
      try {
        // 1. Fetch Users for the dropdown
        const users = await pb
          .collection("users")
          .getList(1, 100, { filter: user.verified ? "" : "public = true" });
        const current = users.items.find((u) => u.id === user.id);
        if (!isCancelled) {
          setUserList(current ? users.items : [user, ...users.items]);
        }

        let filter = "";
        if (viewingUser) {
          filter = `owner = "${viewingUser}"`;
        } else {
          filter = user.verified
            ? ""
            : `(owner.public = true || owner = "${user.id}")`;
        }

        const p = await pb
          .collection("photos")
          .getList(1, 1000, { sort: "-created", filter, expand: "owner" });

        if (!isCancelled) {
          setPhotos(p.items);
        }
      } catch (err) {
        if (!isCancelled) console.error(err);
      }
    }
    loadData();
    return () => {
      isCancelled = true;
    };
  }, [user?.id, user?.verified, viewingUser]);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setUploading(true);
    setUploadProgress(0);

    const totalSize = files.reduce((acc, file) => acc + file.size, 0);
    const loadedTracker = new Array(files.length).fill(0);

    try {
      const owner = user.verified && viewingUser ? viewingUser : user.id;
      const token = pb.authStore.token;

      const uploadPromises = files.map((file, index) => {
        const fd = new FormData();
        fd.append("image", file);
        fd.append("owner", owner);

        return axios
          .post(`${pb.baseUrl}/api/collections/photos/records`, fd, {
            headers: {
              Authorization: token,
              "Content-Type": "multipart/form-data",
            },
            onUploadProgress: (progressEvent) => {
              loadedTracker[index] = progressEvent.loaded;

              const totalLoaded = loadedTracker.reduce((a, b) => a + b, 0);
              const percent = Math.round((totalLoaded / totalSize) * 100);

              setUploadProgress(percent);
            },
          })
          .then((res) => res.data);
      });

      const newPhotos = await Promise.all(uploadPromises);
      setPhotos((prev) => [...newPhotos, ...prev]);
    } catch (err) {
      console.error(err);
      alert("Upload error");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const confirmDelete = async () => {
    if (!photoToDelete) return;
    try {
      await pb.collection("photos").delete(photoToDelete.id);
      setPhotos((p) => p.filter((x) => x.id !== photoToDelete.id));
      setPhotoToDelete(null);
    } catch {
      alert("Delete failed");
    }
  };

  const getTitle = () => {
    if (viewingUser === user?.id) return "My Gallery";
    if (!viewingUser) return "All Photos";
    const u = userList.find((x) => x.id === viewingUser);
    return u ? u.name || "User" : "Gallery";
  };

  const columns = useMemo(() => {
    const cols = Array.from({ length: numCols }, () => []);
    photos.forEach((photo, i) => {
      cols[i % numCols].push({ ...photo, originalIndex: i });
    });
    return cols;
  }, [photos, numCols]);

  const grid = useMemo(
    () => (
      <div className="masonry-container">
        <motion.div
          className="masonry-grid"
          key={photos.length}
          variants={gridContainerVariants}
          initial="hidden"
          animate="show"
        >
          {columns.map((col, colIndex) => (
            <div key={colIndex} className="masonry-column">
              {col.map((photo) => (
                <motion.div
                  key={photo.id}
                  custom={photo.originalIndex} // Pass original index for correct delay
                  className="masonry-item"
                  variants={gridItemVariants}
                >
                  {(user?.verified || photo.owner === user?.id) && (
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
                  {isVideo(photo.image) && (
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        zIndex: 2,
                        pointerEvents: "none",
                      }}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{
                          fontSize: "3rem",
                          color: "white",
                          textShadow: "0 0 10px rgba(0,0,0,0.5)",
                        }}
                      >
                        play_circle
                      </span>
                    </div>
                  )}
                  {isVideo(photo.image) ? (
                    <video
                      src={pb.files.getURL(photo, photo.image)}
                      className="photo-img"
                      muted
                      playsInline
                      loop
                      onMouseOver={(e) => e.target.play()}
                      onMouseOut={(e) => e.target.pause()}
                      onClick={() => {
                        enterFullscreen();
                        setPage([page + 1, 1]);
                        setSelectedPhoto(photo);
                      }}
                    />
                  ) : (
                    <img
                      src={pb.files.getURL(photo, photo.image, {
                        thumb: "480x0",
                      })}
                      loading={photo.originalIndex < 4 ? "eager" : "lazy"}
                      className="photo-img"
                      onClick={() => {
                        enterFullscreen();
                        setPage([page + 1, 1]);
                        setSelectedPhoto(photo);
                      }}
                    />
                  )}
                </motion.div>
              ))}
            </div>
          ))}
        </motion.div>
      </div>
    ),
    [columns, page, user],
  );

  const toggleVisibility = async () => {
    const newStatus = !user.public;
    setUser({ ...user, public: newStatus });

    try {
      await pb.collection("users").update(user.id, {
        public: newStatus,
      });
      console.log("Database updated to:", newStatus);
    } catch (error) {
      console.error("Failed to update database:", error);
      setUser({ ...user, public: !newStatus });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!selectedPhoto) return;
      if (e.key === "ArrowRight") changePhoto(1);
      if (e.key === "ArrowLeft") changePhoto(-1);
      if (e.key === "Escape") closeLightbox();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPhoto, changePhoto, closeLightbox]); // Dependencies are now stable

  return (
    <Routes>
      <Route
        path="/login"
        element={
          pb.authStore.isValid && user ? (
            <Navigate to="/" replace />
          ) : (
            <Auth pb={pb} onLogin={setUser} />
          )
        }
      />
      <Route
        path="/"
        element={
          !pb.authStore.isValid || !user ? (
            <Navigate to="/login" replace />
          ) : (
            <div className="gallery-container">
              <header>
                <div className="header">
                  <div className="profile-dropdown" tabIndex={0}>
                    <div className="profile-bubble">
                      <div className="profile-image">
                        {user.avatar ? (
                          <img
                            src={pb.files.getURL(user, user.avatar, {
                              thumb: "100x0",
                            })}
                          />
                        ) : (
                          <span className="material-symbols-outlined">
                            account_circle
                          </span>
                        )}
                      </div>
                      <div className="profile-info">
                        <span className="username">
                          {user.name}
                          {user.verified && (
                            <span
                              className="material-symbols-outlined"
                              style={{
                                fontSize: "0.9rem",
                                marginLeft: "4px",
                                verticalAlign: "middle",
                                color: "#3b82f6",
                              }}
                            >
                              verified
                            </span>
                          )}
                        </span>
                        <span className="user-subtitle">
                          {user.verified ? "Admin" : user.title || "Model"}
                        </span>
                      </div>
                    </div>
                    <div className="dropdown-content1">
                      <div className="dropdown-header">Profile Options</div>
                      <AvatarUpload user={user} pb={pb} setUser={setUser} />
                      <div
                        className="visibility-toggle"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="toggle-label">Public Profile</span>
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={user.public || false}
                            onChange={toggleVisibility}
                          />
                          <span className="slider"></span>
                        </label>
                      </div>
                      <div
                        onClick={() => {
                          pb.authStore.clear();
                          setUser(null);
                        }}
                        className="logout-container"
                      >
                        <span>Logout</span>
                        <span className="material-symbols-outlined ">
                          logout
                        </span>
                      </div>
                    </div>
                  </div>
                  <div
                    className={`dropdown ${filterOpen ? "active" : ""}`}
                    onMouseEnter={() => setFilterOpen(true)}
                    onMouseLeave={() => setFilterOpen(false)}
                  >
                    <button
                      className="main-button"
                      onClick={() => setFilterOpen(!filterOpen)}
                    >
                      {getTitle()}{" "}
                      <span className="material-symbols-outlined">
                        expand_more
                      </span>
                    </button>
                    <div className="dropdown-content">
                      <div
                        className={`dropdown-item ${viewingUser === user.id ? "active" : ""}`}
                        onClick={() => handleSelectUser(user.id)}
                      >
                        My Photos
                      </div>
                      <div className="dropdown-divider"></div>
                      {userList
                        .filter((u) => u.id !== user.id)
                        .map((u) => (
                          <div
                            key={u.id}
                            className={`dropdown-item ${viewingUser === u.id ? "active" : ""}`}
                            onClick={() => handleSelectUser(u.id)}
                          >
                            {u.name || u.email}
                          </div>
                        ))}
                      <div className="dropdown-divider"></div>
                      <div
                        className={`dropdown-item ${!viewingUser ? "active" : ""}`}
                        onClick={() => handleSelectUser(null)}
                      >
                        View All
                      </div>
                    </div>
                  </div>

                  <div
                    className="header-actions"
                    style={{ flexDirection: "column", alignItems: "flex-end" }}
                  >
                    {/* 1. The Upload Button */}
                    <label className="upload-btn">
                      {uploading ? (
                        <div
                          className="spinner"
                          style={{
                            width: 18,
                            height: 18,
                            borderTopColor: "black",
                          }}
                        ></div>
                      ) : (
                        <span className="material-symbols-outlined">add</span>
                      )}
                      <input
                        type="file"
                        onChange={handleUpload}
                        multiple
                        style={{ display: "none" }}
                        disabled={uploading}
                      />
                    </label>

                    {uploading && (
                      <div style={{ width: "150px", marginTop: "10px" }}>
                        {" "}
                        <div
                          style={{
                            width: "100%",
                            backgroundColor: "#e0e0e0",
                            borderRadius: "4px",
                            height: "10px",
                            overflow: "hidden", // Keeps the green bar inside the rounded corners
                          }}
                        >
                          <div
                            style={{
                              width: `${uploadProgress}%`,
                              backgroundColor: "#4caf50",
                              height: "100%",
                              transition: "width 0.2s ease-in-out",
                            }}
                          />
                        </div>
                        <p
                          style={{
                            fontSize: "10px",
                            textAlign: "center",
                            marginTop: "2px",
                            color: "#666",
                          }}
                        >
                          {uploadProgress}%
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </header>

              {grid}

              <AnimatePresence>
                {photoToDelete && (
                  <motion.div
                    className="modal-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setPhotoToDelete(null)}
                  >
                    <motion.div
                      className="delete-modal"
                      initial={{ scale: 0.95 }}
                      animate={{ scale: 1 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <h3 className="modal-title">Delete Photo?</h3>
                      <p style={{ marginBottom: 20, color: "#aaa" }}>
                        This cannot be undone.
                      </p>
                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                          width: "100%",
                          justifyContent: "center",
                        }}
                      >
                        <button
                          className="modal-btn cancel"
                          onClick={() => setPhotoToDelete(null)}
                        >
                          Cancel
                        </button>
                        <button
                          className="modal-btn delete"
                          onClick={confirmDelete}
                        >
                          Delete
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence initial={false} custom={direction}>
                {selectedPhoto && (
                  <motion.div
                    className="lightbox"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={closeLightbox}
                  >
                    <div
                      className="responsive-container"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ProgressiveImage
                        key={selectedPhoto.id}
                        photo={selectedPhoto}
                        direction={direction}
                        onClose={closeLightbox}
                        onDragEnd={(e, { offset, velocity }) => {
                          const swipe = swipePower(offset.x, velocity.x);
                          const swipeY = swipePower(offset.y, velocity.y);

                          if (swipe < -swipeConfidenceThreshold) {
                            changePhoto(1);
                          } else if (swipe > swipeConfidenceThreshold) {
                            changePhoto(-1);
                          } else if (
                            offset.y > 100 ||
                            (offset.y > 50 && swipeY > swipeConfidenceThreshold)
                          ) {
                            closeLightbox();
                          }
                        }}
                      />

                      <div className="lightbox-header">
                        <a
                          href={
                            pb.files.getURL(
                              selectedPhoto,
                              selectedPhoto.image,
                            ) + "?download=1"
                          }
                          className="icon-btn"
                          download
                        >
                          <span className="material-symbols-outlined">
                            download
                          </span>
                        </a>
                        <button
                          className="icon-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            closeLightbox();
                          }}
                        >
                          <span className="material-symbols-outlined">
                            close
                          </span>
                        </button>
                      </div>

                      <button
                        className="nav-btn left"
                        onClick={(e) => {
                          e.stopPropagation();
                          changePhoto(-1);
                        }}
                      >
                        <span className="material-symbols-outlined">
                          chevron_left
                        </span>
                      </button>
                      <button
                        className="nav-btn right"
                        onClick={(e) => {
                          e.stopPropagation();
                          changePhoto(1);
                        }}
                      >
                        <span className="material-symbols-outlined">
                          chevron_right
                        </span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
