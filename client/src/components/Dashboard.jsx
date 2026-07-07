import React from 'react';

const randomRooms = ['morning-session', 'team-review', 'dev-work', 'pair-coding', 'bug-fix', 'feature-build', 'quick-fix'];
const randomUsers = ['alex', 'sam', 'jordan', 'taylor', 'morgan', 'casey', 'riley', 'drew'];

export default function Dashboard({
  theme,
  onToggleTheme,
  roomInput,
  setRoomInput,
  usernameInput,
  setUsernameInput,
  onSubmit,
}) {
  const generateRandomRoom = () => {
    const pick = randomRooms[Math.floor(Math.random() * randomRooms.length)];
    const num = Math.floor(Math.random() * 9000) + 1000;
    setRoomInput(`${pick}-${num}`);
  };

  const generateRandomUser = () => {
    const name = randomUsers[Math.floor(Math.random() * randomUsers.length)];
    const num = Math.floor(Math.random() * 90) + 10;
    setUsernameInput(`${name}${num}`);
  };

  return (
    <div className="dashboard-container">
      <button
        onClick={onToggleTheme}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: 'none',
          border: '1px solid var(--border-color)',
          borderRadius: '6px',
          width: '36px',
          height: '36px',
          cursor: 'pointer',
          fontSize: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-primary)',
        }}
        title="Toggle theme"
      >
        {theme === 'dark' ? '☀' : '☾'}
      </button>

      <div className="dashboard-card">
        <h1 className="dashboard-title">Code Together</h1>
        <p className="dashboard-subtitle">
          Start or join a shared coding session. Changes sync in real time across all connected users.
        </p>

        <form onSubmit={onSubmit}>
          <div className="input-group">
            <label className="input-label">Your name</label>
            <div className="input-wrapper">
              <input
                type="text"
                placeholder="Enter your name..."
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="dashboard-input"
                required
              />
              <button type="button" onClick={generateRandomUser} className="random-btn">
                Random
              </button>
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Room</label>
            <div className="input-wrapper">
              <input
                type="text"
                placeholder="Enter or generate a room name..."
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
                className="dashboard-input"
                required
              />
              <button type="button" onClick={generateRandomRoom} className="random-btn">
                Random
              </button>
            </div>
          </div>

          <button type="submit" className="submit-btn">
            Join Room
          </button>
        </form>
      </div>
    </div>
  );
}
