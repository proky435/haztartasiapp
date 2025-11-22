import React from 'react';
import './UserProfile.css';

function UserProfile({ user, onLogout }) {
  return (
    <div className="user-profile-dropdown">
      <div className="profile-header">
        <div className="profile-avatar">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="profile-info">
          <h3>{user.name}</h3>
          <p>{user.email}</p>
        </div>
      </div>

      <div className="profile-actions">
        <button onClick={onLogout} className="logout-button">
          🚪 Kijelentkezés
        </button>
      </div>
    </div>
  );
}

export default UserProfile;
