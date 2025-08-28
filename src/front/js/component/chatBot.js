import React, { useState } from "react";
import "../../styles/chatbot.css";

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [conversation, setConversation] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [vozActiva, setVozActiva] = useState(true);

  const speak = (text) => {
    if (!vozActiva) return;
    const synth = window.speechSynthesis;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "es-ES";
    synth.speak(utter);
  };

  const handleVoiceInput = () => {
    if (!("webkitSpeechRecognition" in window)) {
      alert("Tu navegador no soporta reconocimiento de voz.");
      return;
    }

    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = "es-ES";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setMessage(transcript);
      sendMessage(transcript);
    };

    recognition.onerror = (event) => {
      console.error("Error de reconocimiento:", event.error);
      alert("No se pudo escuchar tu voz. Intenta de nuevo.");
    };

    recognition.start();
  };

  const sendMessage = async (msg = message) => {
    if (!msg.trim()) return;
  
    setConversation((prev) => [...prev, { role: "user", content: msg }]);
    setLoading(true);
    setError(null);
  
    const url = `${process.env.REACT_APP_BACKEND_URL.replace(/\/$/, '')}/chatbot/chat`;
    console.log("🧠 Enviando a:", url);
  
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
  
      let data;
      try {
        data = await res.json();
      } catch (jsonError) {
        throw new Error("La respuesta del servidor no es JSON válido.");
      }
  
      if (res.ok && data.reply) {
        setConversation((prev) => [...prev, { role: "assistant", content: data.reply }]);
        speak(data.reply);
      } else {
        const fallback = data.error || "Error al procesar la respuesta del asistente.";
        setConversation((prev) => [...prev, { role: "assistant", content: fallback }]);
        speak(fallback);
        setError(fallback);
      }
  
    } catch (err) {
      console.error("❌ Error real:", err);
      const fallback = err.message || "Error de conexión con el servidor.";
      setConversation((prev) => [...prev, { role: "assistant", content: fallback }]);
      speak(fallback);
      setError(fallback);
    } finally {
      setMessage("");
      setLoading(false);
    }
  };
  

  const handleKeyPress = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  return (
    <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 9999 }}>
      {isOpen ? (
        <div className="card p-3 shadow chatbot-card animate__animated animate__fadeInUp">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              <i className="fas fa-user-cog text-white me-2"></i> Mantenito
            </h5>
            <button className="btn-cerrar-chat" onClick={() => setIsOpen(false)}>✖</button>
          </div>

          {/* Toggle voz */}
          <div className="text-end mt-2">
            <button className="btn btn-sm btn-voz-toggle" onClick={() => setVozActiva(!vozActiva)}>
              {vozActiva ? "🔊 Voz activada" : "🔇 Voz desactivada"}
            </button>
          </div>

          <div className="chat-box mt-2">
            {conversation.map((msg, i) => (
              <div key={i} className={`chat-msg ${msg.role}`}>
                <strong>{msg.role === "user" ? "Tú" : "Mantenito"}:</strong> {msg.content}
              </div>
            ))}
            {loading && <div className="chat-msg assistant">Mantenito está pensando...</div>}
          </div>

          <div className="input-group mt-2">
            <input
              type="text"
              placeholder="Escribe tu pregunta..."
              className="form-control"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={loading}
            />
            <button
              className="voice-btn"
              onClick={handleVoiceInput}
              disabled={loading}
              title="Hablar"
            >
              🎤
            </button>
          </div>

          <button
            className="btn btn-send w-100 mt-2"
            onClick={() => sendMessage()}
            disabled={loading}
          >
            Enviar
          </button>

          {error && <div className="alert alert-danger mt-2">{error}</div>}
        </div>
      ) : (
        <button
          className="fab-mantenito animate__animated animate__bounceIn"
          onClick={() => setIsOpen(true)}
          title="Habla con Mantenito"
        >
          🤖
        </button>
      )}
    </div>
  );
};

export default Chatbot;
