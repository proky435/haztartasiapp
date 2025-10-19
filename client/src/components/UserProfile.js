import React, { useState } from 'react';
import './UserProfile.css';

function UserProfile({ user, onLogout, onUpdateProfile }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = () => {
    onUpdateProfile(formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      name: user.name,
      email: user.email
    });
    setIsEditing(false);
  };

  return (
    <div className="user-profile-dropdown">
      <div className="profile-header">
        <div className="profile-avatar">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="profile-info">
          {isEditing ? (
            <div className="edit-form">
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="edit-input"
                placeholder="Név"
              />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="edit-input"
                placeholder="Email"
              />
            </div>
          ) : (
            <>
              <h3>{user.name}</h3>
              <p>{user.email}</p>
            </>
          )}
        </div>
      </div>

      <div className="profile-actions">
        {isEditing ? (
          <div className="edit-actions">
            <button onClick={handleSave} className="save-button">
              ✓ Mentés
            </button>
            <button onClick={handleCancel} className="cancel-button">
              ✕ Mégse
            </button>
          </div>
        ) : (
          <>
            <button 
              onClick={() => setIsEditing(true)} 
              className="edit-profile-button"
            >
              ✏️ Profil szerkesztése
            </button>
            <button onClick={onLogout} className="logout-button">
              🚪 Kijelentkezés
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default UserProfile;
