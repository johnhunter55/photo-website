import React from "react";

export function Header() {
  return (
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
              <span className="material-symbols-outlined ">logout</span>
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
            <span className="material-symbols-outlined">expand_more</span>
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
  );
}
