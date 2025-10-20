import React, { useState, useEffect } from 'react';
import householdsService from '../services/householdsService';
import './HouseholdManager.css';

function HouseholdManager({ user, currentHousehold, onHouseholdChange, onClose }) {
  const [households, setHouseholds] = useState([]);
  const [newHouseholdName, setNewHouseholdName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [generatedInviteCode, setGeneratedInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('manage'); // 'manage', 'create', 'join'
  const [error, setError] = useState('');

  useEffect(() => {
    loadHouseholds();
  }, []);

  const loadHouseholds = async () => {
    try {
      const userHouseholds = await householdsService.getUserHouseholds();
      setHouseholds(userHouseholds);
    } catch (error) {
      console.error('Error loading households:', error);
    }
  };

  // Új háztartás létrehozása
  const handleCreateHousehold = async (e) => {
    e.preventDefault();
    if (!newHouseholdName.trim()) return;

    try {
      setIsLoading(true);
      setError('');
      const newHousehold = await householdsService.createHousehold({
        name: newHouseholdName.trim(),
        description: `${user.name} háztartása`
      });
      
      await loadHouseholds();
      setNewHouseholdName('');
      onHouseholdChange(newHousehold);
      setActiveTab('manage');
    } catch (error) {
      console.error('Error creating household:', error);
      setError(error.response?.data?.message || error.message || 'Hiba történt a háztartás létrehozásakor');
    } finally {
      setIsLoading(false);
    }
  };

  // Csatlakozás háztartáshoz
  const handleJoinHousehold = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    try {
      setIsLoading(true);
      setError('');
      const joinedHousehold = await householdsService.joinHousehold(inviteCode.trim());
      
      await loadHouseholds();
      setInviteCode('');
      onHouseholdChange(joinedHousehold);
      setActiveTab('manage');
    } catch (error) {
      console.error('Error joining household:', error);
      setError(error.response?.data?.message || error.message || 'Hiba történt a csatlakozáskor');
    } finally {
      setIsLoading(false);
    }
  };

  // Meghívó kód generálása
  const handleGenerateInvite = async (householdId) => {
    try {
      setIsLoading(true);
      setError('');
      const invite = await householdsService.generateInviteCode(householdId);
      setGeneratedInviteCode(invite.inviteCode);
    } catch (error) {
      console.error('Error generating invite:', error);
      setError(error.response?.data?.message || error.message || 'Hiba történt a meghívó generálásakor');
    } finally {
      setIsLoading(false);
    }
  };

  // Meghívó kód másolása
  const copyInviteCode = () => {
    navigator.clipboard.writeText(generatedInviteCode);
    alert('Meghívó kód vágólapra másolva!');
  };

  return (
    <div className="modal-overlay">
      <div className="household-manager-modal">
        <div className="modal-header">
          <h2>Háztartások Kezelése</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'manage' ? 'active' : ''}`}
            onClick={() => setActiveTab('manage')}
          >
            Kezelés
          </button>
          <button 
            className={`tab ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            Új Háztartás
          </button>
          <button 
            className={`tab ${activeTab === 'join' ? 'active' : ''}`}
            onClick={() => setActiveTab('join')}
          >
            Csatlakozás
          </button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="tab-content">
          {activeTab === 'manage' && (
            <div className="manage-tab">
              <h3>Háztartásaim</h3>
              {households.length === 0 ? (
                <div className="no-households">
                  <p>Még nincs háztartásod.</p>
                  <p>Hozz létre egyet vagy csatlakozz egy meglévőhöz!</p>
                </div>
              ) : (
                <div className="households-list">
                  {households.map(household => (
                    <div 
                      key={household.id} 
                      className={`household-card ${currentHousehold?.id === household.id ? 'current' : ''}`}
                    >
                      <div className="household-info">
                        <h4>{household.name}</h4>
                        <p>{household.description}</p>
                        <div className="household-meta">
                          <span>👥 {household.memberCount || 1} tag</span>
                          <span>📦 {household.itemCount || 0} termék</span>
                          <span className="role">Szerepkör: {household.userRole}</span>
                        </div>
                      </div>
                      
                      <div className="household-actions">
                        {currentHousehold?.id !== household.id && (
                          <button 
                            className="select-button"
                            onClick={() => onHouseholdChange(household)}
                          >
                            Kiválaszt
                          </button>
                        )}
                        
                        <button 
                          className="invite-button"
                          onClick={() => handleGenerateInvite(household.id)}
                          disabled={isLoading}
                        >
                          Meghívó
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {generatedInviteCode && (
                <div className="invite-code-display">
                  <h4>Meghívó Kód</h4>
                  <div className="invite-code-box">
                    <code>{generatedInviteCode}</code>
                    <button onClick={copyInviteCode} className="copy-button">
                      📋 Másolás
                    </button>
                  </div>
                  <p className="invite-hint">
                    Oszd meg ezt a kódot azokkal, akiket meg szeretnél hívni a háztartásba.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'create' && (
            <div className="create-tab">
              <h3>Új Háztartás Létrehozása</h3>
              <form onSubmit={handleCreateHousehold}>
                <div className="form-group">
                  <label htmlFor="householdName">Háztartás neve:</label>
                  <input
                    type="text"
                    id="householdName"
                    value={newHouseholdName}
                    onChange={(e) => setNewHouseholdName(e.target.value)}
                    placeholder="pl. Kovács család háztartása"
                    required
                  />
                </div>
                
                <button type="submit" disabled={isLoading || !newHouseholdName.trim() || households.length >= 5}>
                  {isLoading ? 'Létrehozás...' : households.length >= 5 ? 'Limit elérve (5/5)' : 'Háztartás Létrehozása'}
                </button>
              </form>
              
              <div className="info-box">
                <h4>ℹ️ Tudnivalók</h4>
                <ul>
                  <li>Te leszel a háztartás adminisztrátora</li>
                  <li>Bármely tag generálhat meghívó kódot</li>
                  <li>Közösen kezelhettek készletet és bevásárlólistákat</li>
                  <li><strong>Maximum 5 háztartásnak lehetsz tagja ({households.length}/5)</strong></li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'join' && (
            <div className="join-tab">
              <h3>Csatlakozás Háztartáshoz</h3>
              <form onSubmit={handleJoinHousehold}>
                <div className="form-group">
                  <label htmlFor="inviteCode">Meghívó kód:</label>
                  <input
                    type="text"
                    id="inviteCode"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="Írd be a meghívó kódot"
                    required
                  />
                </div>
                
                <button type="submit" disabled={isLoading || !inviteCode.trim() || households.length >= 5}>
                  {isLoading ? 'Csatlakozás...' : households.length >= 5 ? 'Limit elérve (5/5)' : 'Csatlakozás'}
                </button>
              </form>
              
              <div className="info-box">
                <h4>ℹ️ Hogyan működik?</h4>
                <ul>
                  <li>Kérj meghívó kódot bármely háztartás tagtól</li>
                  <li>Írd be a kódot a fenti mezőbe</li>
                  <li>Csatlakozás után láthatod a közös készletet</li>
                  <li><strong>Maximum 5 háztartásnak lehetsz tagja ({households.length}/5)</strong></li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default HouseholdManager;
