import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import '../styles/Messaging.css';

const Messaging = ({ currentUser }) => {
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadByContact, setUnreadByContact] = useState({});
  const [error, setError] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [attachment, setAttachment] = useState(null);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const fileInputRef = useRef(null);
  const selectedContactRef = useRef(null);

  useEffect(() => {
    selectedContactRef.current = selectedContact;
  }, [selectedContact]);

  const API = import.meta.env.VITE_API_URL;

  // Initialize Socket.io connection
  useEffect(() => {
    console.log('Initializing Socket.io connection...');
    
    socketRef.current = io(API, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    socketRef.current.on('connect', () => {
      console.log('✅ Connected to Socket.io server');
      // Notify server that user is online
      if (currentUser) {
        const userId = currentUser?._id || currentUser?.id;
        socketRef.current.emit('user-online', userId);
      }
    });

    socketRef.current.on('receive-message', (message) => {
      console.log('📨 Received message via socket:', message);
      setMessages(prev => [...prev, message]);
    });

    socketRef.current.on('message-sent', (message) => {
      console.log('✅ Message sent successfully:', message);
      // Message already added by sendMessage function
    });

    socketRef.current.on('message-error', (data) => {
      console.error('❌ Socket error:', data.error);
      setError('Failed to send message: ' + data.error);
    });

    socketRef.current.on('user-status', (data) => {
      console.log(`User ${data.userId} is ${data.status}`);
      setOnlineUsers(prev => {
        if (data.status === 'online') {
          return prev.includes(data.userId) ? prev : [...prev, data.userId];
        } else {
          return prev.filter(u => u !== data.userId);
        }
      });
    });

    socketRef.current.on('disconnect', () => {
      console.log('❌ Disconnected from Socket.io server');
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [API, currentUser]);

  // Fetch all users for contacts
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        console.log('Fetching users from:', `${API}/users`);
        const response = await axios.get(`${API}/users`);
        console.log('Users fetched:', response.data);
        const userId = currentUser?._id || currentUser?.id;
        const filtered = response.data.filter(u => u._id !== userId && u.id !== userId);
        setUsers(filtered);
      } catch (error) {
        console.error('Error fetching users:', error);
        setError('Failed to load users. Please refresh.');
      }
    };

    if (currentUser && (currentUser._id || currentUser.id)) {
      fetchUsers();
    }
  }, [currentUser, API]);

  // Fetch messages for current user (history on load)
  useEffect(() => {
    const userId = currentUser?._id || currentUser?.id;
    if (!userId) {
      console.log('No valid user ID found');
      return;
    }

    const fetchMessages = async () => {
      try {
        console.log('Fetching message history for user:', userId);
        const response = await axios.get(`${API}/messages/${userId}`);
        console.log('Messages fetched:', response.data);
        setMessages(response.data);

        // Build contacts list from messages
        const contactsMap = new Map();
        const unreadCounts = {};
        response.data.forEach(msg => {
          if (!msg.sender || !msg.recipient) return;
          const otherUser = msg.sender._id === userId ? msg.recipient : msg.sender;
          if (!contactsMap.has(otherUser._id)) {
            contactsMap.set(otherUser._id, otherUser);
          }
          if ((msg.recipient._id === userId || msg.recipient === userId) && !msg.isRead) {
            const senderId = msg.sender._id || msg.sender;
            unreadCounts[senderId] = (unreadCounts[senderId] || 0) + 1;
          }
        });

        setContacts(Array.from(contactsMap.values()));
        setUnreadByContact(unreadCounts);

        // Fetch unread count
        const unreadRes = await axios.get(`${API}/messages-unread/${userId}`);
        setUnreadCount(unreadRes.data.unreadCount);
      } catch (error) {
        console.error('Error fetching messages:', error);
        setError('Failed to load messages.');
      }
    };

    fetchMessages();
    // Fetch history once on mount, then use socket for real-time
  }, [currentUser, API]);

  // Load conversation with selected contact
  useEffect(() => {
    if (!selectedContact) return;

    const userId = currentUser?._id || currentUser?.id;
    if (!userId) return;

    const fetchConversation = async () => {
      try {
        setLoading(true);
        console.log('Fetching conversation between', userId, 'and', selectedContact._id);
        
        const response = await axios.get(
          `${API}/messages/${userId}/${selectedContact._id}`
        );
        
        console.log('Conversation loaded:', response.data.length, 'messages');
        response.data.forEach((msg, idx) => {
          console.log(`  [${idx}]`, msg.sender._id === userId ? 'SENT' : 'RECEIVED', ':', msg.text);
        });
        
        setMessages(response.data);

        // Mark messages as read
        response.data.forEach(msg => {
          if (msg.recipient && msg.recipient._id === userId && !msg.isRead) {
            axios.put(`${API}/messages/${msg._id}/read`).catch(err => 
              console.error('Error marking as read:', err)
            );
          }
        });

        setUnreadByContact(prev => {
          const newCounts = { ...prev };
          const contactId = selectedContact._id;
          if (newCounts[contactId]) {
            setUnreadCount(count => Math.max(0, count - newCounts[contactId]));
            delete newCounts[contactId];
          }
          return newCounts;
        });

        setLoading(false);
      } catch (error) {
        console.error('Error fetching conversation:', error);
        setError('Failed to load conversation');
        setLoading(false);
      }
    };

    fetchConversation();
    // No polling needed - socket.io provides real-time updates
  }, [selectedContact, currentUser, API]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Deduplicate incoming messages
  useEffect(() => {
    if (!socketRef.current) return;

    const handleReceive = (message) => {
      console.log('📨 Received message via socket:', message);
      setMessages(prev => {
        if (prev.some(m => m._id === message._id)) return prev; // PREVENT DUPLICATES
        return [...prev, message];
      });
      
      const currentUserId = currentUser?._id || currentUser?.id;
      const recipientId = message.recipient._id || message.recipient;
      if (recipientId === currentUserId) {
        const senderId = message.sender._id || message.sender;
        if (!selectedContactRef.current || selectedContactRef.current._id !== senderId) {
          setUnreadByContact(prev => ({
            ...prev,
            [senderId]: (prev[senderId] || 0) + 1
          }));
          setUnreadCount(prev => prev + 1);
        } else {
          axios.put(`${API}/messages/${message._id}/read`).catch(console.error);
        }
      }
    };

    const handleSent = (message) => {
      console.log('✅ Message sent successfully:', message);
      setMessages(prev => {
        if (prev.some(m => m._id === message._id)) return prev; // PREVENT DUPLICATES
        return [...prev, message];
      });
    };

    // We must remove existing listeners before adding new ones to avoid duplicate triggers
    socketRef.current.off('receive-message');
    socketRef.current.off('message-sent');

    socketRef.current.on('receive-message', handleReceive);
    socketRef.current.on('message-sent', handleSent);

  }, []); // Run once to attach deduplicated listeners

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append("attachment", file);
    
    try {
      const res = await axios.post(`${API}/messages/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setAttachment(res.data.attachment);
    } catch (err) {
      setError("Failed to upload file");
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !attachment) || !selectedContact) return;

    const userId = currentUser?._id || currentUser?.id;
    if (!userId) {
      setError('User not logged in');
      return;
    }

    try {
      socketRef.current.emit('send-message', {
        sender: userId,
        recipient: selectedContact._id,
        text: newMessage,
        attachments: attachment ? [attachment] : []
      });
      setNewMessage('');
      setAttachment(null);
      setError(null);
    } catch (error) {
      setError('Failed to send message: ' + (error.response?.data?.message || error.message));
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getPhotoUrl = (id) => {
    return `${API}/users/${id}/photo`;
  };

  const styles = {
    splitViewContainer: { display: "flex", height: "calc(100vh - 180px)", background: "white", borderRadius: "8px", border: "1px solid #d0d7de", overflow: "hidden" },
    sidebar: { width: "250px", borderRight: "1px solid #d0d7de", background: "#f6f8fa", display: "flex", flexDirection: "column" },
    sidebarItem: (active) => ({ padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid #d0d7de", cursor: "pointer", background: active ? "#fff" : "transparent", borderLeft: active ? "3px solid #0969da" : "3px solid transparent", transition: "all 0.2s" }),
    mainContent: { flex: 1, display: "flex", flexDirection: "column", background: "white" },
    chatHeader: { padding: "16px", borderBottom: "1px solid #d0d7de", fontWeight: "600", color: "#24292f", display: "flex", alignItems: "center", gap: "10px", background: "#f6f8fa" },
    chatMessages: { flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "12px", background: "#ffffff" },
    bubble: (isMe) => ({ maxWidth: "70%", padding: "10px 14px", borderRadius: "12px", alignSelf: isMe ? "flex-end" : "flex-start", background: isMe ? "#0969da" : "#f6f8fa", color: isMe ? "white" : "#24292f", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", fontSize: "14px", lineHeight: "1.4" }),
    inputArea: { padding: "16px", borderTop: "1px solid #d0d7de", display: "flex", alignItems: "center", gap: "10px", background: "#f6f8fa" },
    formInput: { width: "100%", padding: "8px 12px", border: "1px solid #d0d7de", borderRadius: "6px", fontSize: "14px", color: "#24292f", outline: "none", transition: "border-color 0.2s" },
    primaryBtn: { padding: "8px 16px", background: "#1f883d", color: "white", border: "none", borderRadius: "6px", fontWeight: "600", cursor: "pointer", transition: "background 0.2s" },
  };

  const currentUserId = currentUser?._id || currentUser?.id;

  // Combine available users with recent contacts to form the sidebar list (deduplicated)
  const allSidebarUsers = [...contacts];
  users.forEach(u => {
    if (!allSidebarUsers.find(c => c._id === u._id)) {
      allSidebarUsers.push(u);
    }
  });

  return (
    <div style={{ width: "100%" }}>
      {error && (
        <div style={{ background: '#ffebee', color: '#c62828', padding: '10px', borderRadius: '4px', marginBottom: '10px', fontSize: '14px' }}>
          {error}
        </div>
      )}
      <div style={styles.splitViewContainer}>
        <div style={styles.sidebar}>
          <div style={{padding:"16px", fontWeight:"600", fontSize:"13px", color:"#57606a", borderBottom:"1px solid #d0d7de", display: "flex", justifyContent: "space-between", alignItems: "center"}}>
            <span>Conversations</span>
            {unreadCount > 0 && <span style={{ background: '#ff6b6b', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold' }}>{unreadCount}</span>}
          </div>
          <div style={{overflowY:"auto", flex:1}}>
            {allSidebarUsers.map(u => (
              <div key={u._id} style={styles.sidebarItem(selectedContact && selectedContact._id === u._id)} onClick={() => setSelectedContact(u)}>
                {getPhotoUrl(u._id) ? (
                  <img src={getPhotoUrl(u._id)} style={{width:"32px", height:"32px", borderRadius:"50%", border: "1px solid #d0d7de"}} onError={(e)=>e.target.style.display='none'} alt="" />
                ) : (
                  <div style={{width:"32px", height:"32px", borderRadius:"50%", border: "1px solid #d0d7de", backgroundColor: "#f6f8fa", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", position: "relative"}}>
                    👤
                    {onlineUsers.includes(u._id) && <span style={{ position: 'absolute', bottom: 0, right: 0, width: '8px', height: '8px', background: '#2da44e', borderRadius: '50%', border: '1px solid white' }}></span>}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{fontSize:"13px", fontWeight:"600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{u.name}</div>
                  <div style={{fontSize:"11px", color:"#57606a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{u.email || u.designation}</div>
                </div>
                {unreadByContact[u._id] > 0 && (
                  <div style={{ background: '#ff6b6b', color: 'white', borderRadius: '10px', padding: '2px 8px', fontSize: '11px', fontWeight: 'bold' }}>
                    {unreadByContact[u._id]}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={styles.mainContent}>
          {selectedContact ? (
            <>
              <div style={styles.chatHeader}>
                {getPhotoUrl(selectedContact._id) ? (
                  <img src={getPhotoUrl(selectedContact._id)} style={{width:"24px", height:"24px", borderRadius:"50%"}} onError={(e)=>e.target.style.display='none'} alt="" />
                ) : (
                  <div style={{width:"24px", height:"24px", borderRadius:"50%", backgroundColor: "#e0e7ff", color: "#3730a3", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: "bold"}}>
                    {selectedContact.name.charAt(0)}
                  </div>
                )}
                {selectedContact.name}
              </div>

              <div style={styles.chatMessages}>
                {loading ? (
                  <div style={{display:"flex", alignItems:"center", justifyContent:"center", height:"100%", color:"#57606a", fontSize:"13px"}}>Loading conversation...</div>
                ) : messages.length === 0 ? (
                  <div style={{textAlign:"center", color:"#8c959f", fontSize:"13px", marginTop:"40px"}}>Start a conversation with {selectedContact.name}</div>
                ) : (
                  <>
                    {messages.map((msg, idx) => {
                      const isMe = msg.sender && (msg.sender._id === currentUserId || msg.sender === currentUserId);
                      if (!msg.sender || !msg.recipient) return null; // Hide messages from deleted accounts for safety
                      return (
                        <div key={msg._id || idx} style={styles.bubble(isMe)}>
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div style={{marginBottom: msg.text && msg.text !== "📁 Attachment" ? "8px" : "0"}}>
                              {msg.attachments.map((att, i) => {
                                const isImage = att.url ? att.url.match(/\.(jpeg|jpg|gif|png)$/i) != null : false;
                                return isImage ? (
                                  <img key={i} src={`${API}${att.url}`} alt={att.name} style={{maxWidth: "100%", borderRadius: "8px"}} />
                                ) : (
                                  <a key={i} href={att.url ? `${API}${att.url}` : '#'} target={att.url ? "_blank" : "_self"} rel="noopener noreferrer" style={{color: isMe ? "white" : "#0969da", textDecoration: "underline", display: "flex", alignItems: "center", gap: "4px"}}>
                                    📎 {att.name || 'Unknown File'}
                                  </a>
                                );
                              })}
                            </div>
                          )}
                          {msg.text && msg.text !== "📁 Attachment" && <div>{msg.text}</div>}
                          <div style={{fontSize:"10px", opacity:0.7, marginTop:"4px", textAlign:"right"}}>
                            {formatTime(msg.createdAt)}
                            {isMe && <span style={{marginLeft: "4px", color: msg.isRead ? "#4ecdc4" : "inherit"}}>{msg.isRead ? '✓✓' : '✓'}</span>}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef}></div>
                  </>
                )}
              </div>

              <div style={{...styles.inputArea, position: "relative"}}>
                {attachment && (
                  <div style={{position: "absolute", bottom: "100%", left: "16px", marginBottom: "8px", background: "white", padding: "8px", border: "1px solid #d0d7de", borderRadius: "6px", display: "flex", alignItems: "center", gap: "8px", zIndex: 10, boxShadow: "0 2px 4px rgba(0,0,0,0.1)"}}>
                    <span style={{fontSize: "12px", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>📎 {attachment.name}</span>
                    <button type="button" onClick={() => setAttachment(null)} style={{background: "none", border: "none", cursor: "pointer", color: "#cf222e"}}>✖</button>
                  </div>
                )}
                <form onSubmit={sendMessage} style={{display:"flex", flex:1, gap:"10px", position: "relative"}}>
                  <button type="button" onClick={() => fileInputRef.current.click()} style={{background: "none", border: "none", fontSize: "20px", cursor: "pointer", padding: "0 4px"}} title="Attach file">📎</button>
                  <input type="file" ref={fileInputRef} onChange={handleFileSelect} style={{display: "none"}} />
                  <input 
                    style={{...styles.formInput, marginTop:0, background: "white"}} 
                    placeholder="Type a message..." 
                    value={newMessage} 
                    onChange={(e) => setNewMessage(e.target.value)} 
                  />
                  <button type="submit" style={styles.primaryBtn}>Send</button>
                </form>
              </div>
            </>
          ) : (
            <div style={{display:"flex", alignItems:"center", justifyContent:"center", height:"100%", color:"#57606a"}}>
              Select an employee to start chatting
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messaging;
