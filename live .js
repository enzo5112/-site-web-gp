import React, { useState, useEffect } from 'react';
import { Radio, Trophy, Clock, Flag, MessageSquare, Send, Calendar, MapPin, RefreshCw, Zap, AlertCircle, CheckCircle, Navigation } from 'lucide-react';

export default function F1LiveStream() {
  const [selectedSession, setSelectedSession] = useState('9165'); // Singapore 2023 Race
  const [drivers, setDrivers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [apiStatus, setApiStatus] = useState('connected');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Sessions connues avec données de localisation
  const KNOWN_SESSIONS = [
    { key: '9165', name: 'Singapore GP 2023', type: 'Race', circuit: 'Marina Bay', date: '17 Sept 2023', flag: '🇸🇬' },
    { key: '9161', name: 'Singapore GP 2023', type: 'Qualifying', circuit: 'Marina Bay', date: '16 Sept 2023', flag: '🇸🇬' },
    { key: '9140', name: 'Belgium GP 2023', type: 'Sprint', circuit: 'Spa-Francorchamps', date: '29 Juil 2023', flag: '🇧🇪' },
    { key: '9102', name: 'Canada GP 2023', type: 'Race', circuit: 'Montreal', date: '4 Juin 2023', flag: '🇨🇦' },
    { key: '9078', name: 'Miami GP 2023', type: 'Race', circuit: 'Miami', date: '7 Mai 2023', flag: '🇺🇸' }
  ];

  const currentSession = KNOWN_SESSIONS.find(s => s.key === selectedSession);

  // Fetch data on session change
  useEffect(() => {
    fetchAllData();
    const interval = autoRefresh ? setInterval(fetchAllData, 5000) : null;
    return () => interval && clearInterval(interval);
  }, [selectedSession, autoRefresh]);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 1. Session info
      const sessionRes = await fetch(`https://api.openf1.org/v1/sessions?session_key=${selectedSession}`);
      const sessionData = await sessionRes.json();
      if (sessionData?.[0]) setSessionInfo(sessionData[0]);

      // 2. Drivers
      const driversRes = await fetch(`https://api.openf1.org/v1/drivers?session_key=${selectedSession}`);
      const driversData = await driversRes.json();

      // 3. Positions (latest for each driver)
      const posRes = await fetch(`https://api.openf1.org/v1/position?session_key=${selectedSession}`);
      const posData = await posRes.json();
      
      // Get latest position for each driver
      const latestPos = {};
      posData.forEach(pos => {
        if (!latestPos[pos.driver_number] || new Date(pos.date) > new Date(latestPos[pos.driver_number].date)) {
          latestPos[pos.driver_number] = pos;
        }
      });

      // 4. Location data (for track visualization)
      const locRes = await fetch(`https://api.openf1.org/v1/location?session_key=${selectedSession}`);
      const locData = await locRes.json();
      
      // Get latest location for each driver
      const latestLoc = {};
      locData.forEach(loc => {
        if (!latestLoc[loc.driver_number] || new Date(loc.date) > new Date(latestLoc[loc.driver_number].date)) {
          latestLoc[loc.driver_number] = loc;
        }
      });

      // 5. Combine all data
      const combined = driversData.map(driver => ({
        ...driver,
        position: latestPos[driver.driver_number]?.position || 20,
        location: latestLoc[driver.driver_number]
      })).sort((a, b) => a.position - b.position);

      setDrivers(combined);
      setLocations(Object.values(latestLoc));
      setLastUpdate(new Date());
      setApiStatus('connected');
      
    } catch (err) {
      console.error('Error:', err);
      setError(`Erreur API: ${err.message}`);
      setApiStatus('error');
    } finally {
      setLoading(false);
    }
  };

  // Calculate track bounds for normalization
  const getTrackBounds = () => {
    if (locations.length === 0) return { minX: 0, maxX: 100, minY: 0, maxY: 100 };
    
    const xs = locations.map(l => l.x);
    const ys = locations.map(l => l.y);
    
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys)
    };
  };

  const normalizePosition = (x, y) => {
    const bounds = getTrackBounds();
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    
    return {
      x: ((x - bounds.minX) / width) * 100,
      y: ((y - bounds.minY) / height) * 100
    };
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatLoading(true);

    try {
      const driversContext = drivers.length > 0 
        ? `Top 5: ${drivers.slice(0, 5).map((d, i) => `${i + 1}. ${d.name_acronym} (${d.team_name})`).join(', ')}`
        : '';

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: `Tu es un commentateur F1 passionné.

SESSION: ${currentSession?.name} - ${currentSession?.type}
Circuit: ${currentSession?.circuit}
${driversContext}

Question: ${userMessage}

Réponds avec passion et émojis 🏎️🏁 (2-3 paragraphes max)`
            }
          ]
        })
      });

      const data = await response.json();
      const aiResponse = data.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('\n');

      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Erreur API' }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-gray-900 to-black text-white p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-800 rounded-lg p-6 mb-6 shadow-2xl">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Radio className="w-8 h-8 animate-pulse" />
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">🏎️ F1 Live Tracker avec Circuit</h1>
                <div className="flex items-center gap-2 mt-1">
                  {apiStatus === 'connected' && <CheckCircle className="w-4 h-4 text-green-400" />}
                  {apiStatus === 'error' && <AlertCircle className="w-4 h-4 text-red-400" />}
                  <p className="text-sm text-red-100">OpenF1 API - Positions en temps réel</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  autoRefresh ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'
                }`}
              >
                {autoRefresh ? '⚡ Auto' : '⏸ Manuel'}
              </button>
              <button
                onClick={fetchAllData}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                Actualiser
              </button>
            </div>
          </div>

          {/* Session Info */}
          {currentSession && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 bg-black bg-opacity-30 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <span className="text-3xl">{currentSession.flag}</span>
                <div>
                  <div className="text-xs text-gray-300">Grand Prix</div>
                  <div className="font-semibold">{currentSession.name}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-green-400" />
                <div>
                  <div className="text-xs text-gray-300">Circuit</div>
                  <div className="font-semibold">{currentSession.circuit}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Flag className="w-5 h-5 text-yellow-400" />
                <div>
                  <div className="text-xs text-gray-300">Type</div>
                  <div className="font-semibold">{currentSession.type}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-400" />
                <div>
                  <div className="text-xs text-gray-300">MAJ</div>
                  <div className="font-semibold text-sm">
                    {lastUpdate ? lastUpdate.toLocaleTimeString('fr-FR') : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Session Selector */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6 shadow-2xl">
          <h3 className="text-lg font-bold mb-3">📺 Sélectionner une session</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {KNOWN_SESSIONS.map(session => (
              <button
                key={session.key}
                onClick={() => setSelectedSession(session.key)}
                className={`p-3 rounded-lg text-left transition hover:scale-105 ${
                  selectedSession === session.key ? 'bg-red-600 shadow-lg' : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                <div className="text-2xl mb-1">{session.flag}</div>
                <div className="font-bold text-sm">{session.name}</div>
                <div className="text-xs text-gray-400">{session.type}</div>
                <div className="text-xs text-gray-500 mt-1">{session.date}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content - Map + Leaderboard */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          {/* Track Map */}
          <div className="md:col-span-2 bg-gray-800 rounded-lg shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-3">
              <h3 className="font-bold flex items-center gap-2">
                <Navigation className="w-5 h-5" />
                Circuit - Positions en temps réel
                {locations.length > 0 && <span className="text-sm">({locations.length} pilotes)</span>}
              </h3>
            </div>
            
            <div className="relative bg-gradient-to-br from-green-900 to-green-950 aspect-square">
              {error && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-red-900 bg-opacity-80 p-4 rounded-lg text-center">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">{error}</p>
                  </div>
                </div>
              )}

              {locations.length === 0 && !error && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <Navigation className="w-16 h-16 mx-auto mb-4 animate-pulse" />
                    <p>Chargement du circuit...</p>
                  </div>
                </div>
              )}

              {/* Track visualization */}
              {locations.length > 0 && (
                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                  {/* Draw track line */}
                  <path
                    d={locations.map((loc, i) => {
                      const pos = normalizePosition(loc.x, loc.y);
                      return `${i === 0 ? 'M' : 'L'} ${pos.x} ${pos.y}`;
                    }).join(' ')}
                    stroke="#4B5563"
                    strokeWidth="0.5"
                    fill="none"
                    opacity="0.3"
                  />

                  {/* Draw cars */}
                  {drivers.filter(d => d.location).map(driver => {
                    const pos = normalizePosition(driver.location.x, driver.location.y);
                    return (
                      <g key={driver.driver_number}>
                        {/* Car dot */}
                        <circle
                          cx={pos.x}
                          cy={pos.y}
                          r="1.5"
                          fill={`#${driver.team_colour || 'FFFFFF'}`}
                          stroke="white"
                          strokeWidth="0.3"
                        >
                          <animate
                            attributeName="r"
                            values="1.5;2;1.5"
                            dur="1s"
                            repeatCount="indefinite"
                          />
                        </circle>
                        
                        {/* Driver number */}
                        <text
                          x={pos.x}
                          y={pos.y - 2}
                          fontSize="2"
                          fill="white"
                          textAnchor="middle"
                          fontWeight="bold"
                          stroke="black"
                          strokeWidth="0.1"
                        >
                          {driver.driver_number}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              )}

              {/* Legend */}
              <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 p-2 rounded-lg text-xs">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <span>= Voiture F1</span>
                </div>
                <div className="text-gray-400">Couleur = Équipe</div>
              </div>
            </div>
          </div>

          {/* Leaderboard */}
          <div className="bg-gray-800 rounded-lg p-4 shadow-2xl">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-500" />
              Classement Live
            </h3>

            {drivers.length > 0 ? (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {drivers.slice(0, 15).map((driver, index) => (
                  <div
                    key={driver.driver_number}
                    className="rounded p-3 flex items-center gap-3 transition hover:scale-105"
                    style={{
                      backgroundColor: driver.team_colour ? `#${driver.team_colour}20` : '#374151',
                      borderLeft: driver.team_colour ? `4px solid #${driver.team_colour}` : '4px solid #6B7280'
                    }}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      index === 0 ? 'bg-yellow-500 text-black' :
                      index === 1 ? 'bg-gray-400 text-black' :
                      index === 2 ? 'bg-orange-600 text-white' :
                      'bg-gray-600 text-white'
                    }`}>
                      {driver.position}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm">{driver.name_acronym}</div>
                      <div className="text-xs text-gray-400 truncate">{driver.team_name}</div>
                    </div>
                    <div className="text-xs font-mono" style={{ color: driver.team_colour ? `#${driver.team_colour}` : '#9CA3AF' }}>
                      #{driver.driver_number}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-400 py-8">
                <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Chargement...</p>
              </div>
            )}
          </div>
        </div>

        {/* AI Chat */}
        <div className="bg-gray-800 rounded-lg shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <MessageSquare className="w-6 h-6" />
              Commentateur IA - {currentSession?.name}
            </h3>
          </div>

          <div className="h-80 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 mt-16">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-semibold mb-2">Posez une question!</p>
                <div className="space-y-1 text-sm">
                  <p>💡 "Analyse la course en cours"</p>
                  <p>💡 "Qui est en tête?"</p>
                  <p>💡 "Explique le circuit"</p>
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg p-3 ${
                  msg.role === 'user' ? 'bg-blue-600' : 'bg-gray-700'
                }`}>
                  <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            ))}

            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-700 rounded-lg p-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.15s'}}></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.3s'}}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 bg-gray-900 border-t border-gray-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Posez votre question..."
                className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSendMessage}
                disabled={chatLoading || !input.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg px-6 py-3 font-semibold transition"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}