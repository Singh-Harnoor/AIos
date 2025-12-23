import React, { useState, useEffect, useRef } from 'react';

// --- Configuration ---
// API Key provided by user
const API_KEY = "AIzaSyB5jVm-AutnOkWO5v3PmeI-eOJBJlsGoS8"; 
const MODEL_NAME = "gemini-2.5-flash-preview-09-2025";

const SYSTEM_PROMPT = `You are the GenUI Orchestrator. 
Your primary goal is to turn user requests into functional, beautiful UI components.
1. ALWAYS respond with a self-contained HTML/Tailwind/JS code block.
2. Use Tailwind CSS for styling.
3. Wrap your code in \`\`\`html markdown blocks.
4. For interactivity, define functions on 'window' or use script tags.
5. LISTEN for 'gen-ui-command' event on window for main input bar updates.
6. Make designs look premium: Dark mode, glassmorphism.
7. DO NOT include conversational text outside the code block.`;

const App = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeUI, setActiveUI] = useState(null);
  
  const scrollRef = useRef(null);
  const uiContainerRef = useRef(null);

  // Auto-scroll logic for chat logs
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Handle script execution when a new UI is popped up
  useEffect(() => {
    if (activeUI && uiContainerRef.current) {
      const scripts = uiContainerRef.current.querySelectorAll("script");
      scripts.forEach((oldScript) => {
        const newScript = document.createElement("script");
        newScript.text = `(function() { ${oldScript.text} })();`;
        document.head.appendChild(newScript).parentNode.removeChild(newScript);
      });
    }
  }, [activeUI]);

  const invokeAI = async (userQuery) => {
    if (!API_KEY) {
      return "Error: API Key is missing.";
    }

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: userQuery }] }],
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] }
        })
      });
      
      const result = await response.json();

      if (result.error) {
        throw new Error(result.error.message || "API Error");
      }

      const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      // Extraction logic for the code block
      const htmlMatch = text.match(/```html\n([\s\S]*?)```/i);
      return htmlMatch ? htmlMatch[1] : text;
    } catch (e) {
      return `Error: ${e.message}`;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input;
    setInput('');
    setLoading(true);

    // Communicate with existing UI if open
    if (activeUI) {
      window.dispatchEvent(new CustomEvent('gen-ui-command', { detail: userText }));
    }

    const userMsg = {
      id: Date.now().toString(),
      text: userText,
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMsg]);

    try {
      const aiResponse = await invokeAI(userText);

      const aiMsg = {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        sender: 'aios-core',
        timestamp: new Date(),
        type: (aiResponse.includes('<') || aiResponse.includes('class=')) ? 'code' : 'text'
      };

      setMessages(prev => [...prev, aiMsg]);
      
      // Trigger the pop-up if the response contains code
      if (aiMsg.type === 'code') {
        setActiveUI(aiMsg);
      }
    } catch (err) {
      console.error("AI Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-gray-100 font-sans selection:bg-blue-500/30 overflow-hidden">
      {/* Dynamic Header */}
      <header className="px-6 py-4 border-b border-white/5 bg-black/60 backdrop-blur-2xl flex justify-between items-center z-40">
        <div className="flex items-center space-x-3">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]"></div>
          <h1 className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/60">GenUI Shell</h1>
        </div>
        <div className="text-[8px] text-white/20 font-mono tracking-tighter">
          STATUS: ACTIVE / NO-FIREBASE
        </div>
      </header>

      {/* Main Chat Log Area */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center opacity-20 space-y-4">
            <div className="w-12 h-12 border border-white/10 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
            <p className="text-[10px] uppercase tracking-[0.2em]">Awaiting Command</p>
          </div>
        )}
        
        {messages.map((m) => (
          <div key={m.id} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] px-5 py-3 rounded-2xl text-sm border transition-all ${
              m.sender === 'user' 
                ? 'bg-zinc-800 border-white/5 shadow-xl' 
                : 'bg-white/5 border-white/10 opacity-60 italic'
            }`}>
              {m.sender === 'user' ? m.text : "Interface synthesized."}
              {m.type === 'code' && (
                <button 
                  onClick={() => setActiveUI(m)}
                  className="ml-4 text-[9px] uppercase font-bold text-blue-400 hover:text-blue-300 underline underline-offset-4"
                >
                  View UI
                </button>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex space-x-1.5 py-4 opacity-40">
            <div className="w-1 h-1 bg-white rounded-full animate-bounce [animation-duration:0.6s]"></div>
            <div className="w-1 h-1 bg-white rounded-full animate-bounce [animation-delay:0.1s] [animation-duration:0.6s]"></div>
            <div className="w-1 h-1 bg-white rounded-full animate-bounce [animation-delay:0.2s] [animation-duration:0.6s]"></div>
          </div>
        )}
        <div ref={scrollRef} />
      </main>

      {/* Full-screen Pop-up for AI Interfaces */}
      {activeUI && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black animate-in fade-in zoom-in-95 duration-300">
          <header className="flex justify-between items-center px-6 py-3 border-b border-white/10 bg-zinc-900/80 backdrop-blur-md">
            <div className="flex items-center space-x-3">
              <div className="flex space-x-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50"></div>
              </div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">Active Interface</span>
            </div>
            <button 
              onClick={() => setActiveUI(null)}
              className="px-4 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold hover:bg-white/10 transition-colors uppercase"
            >
              Close
            </button>
          </header>
          <div className="flex-1 overflow-auto bg-zinc-950" ref={uiContainerRef}>
            <div 
              className="w-full h-full"
              dangerouslySetInnerHTML={{ __html: activeUI.text }} 
            />
          </div>
        </div>
      )}

      {/* Input Bar */}
      <footer className="p-6 bg-gradient-to-t from-black via-black to-transparent z-40">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative group">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === ' ') {
                e.stopPropagation();
              }
            }}
            disabled={loading}
            placeholder="Build something new..."
            className="w-full bg-zinc-900 border border-white/10 rounded-2xl py-4 pl-6 pr-24 focus:outline-none focus:ring-1 focus:ring-blue-500/50 text-sm transition-all"
          />
          <button 
            type="submit" 
            disabled={loading || !input.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-white text-black font-black px-5 py-2 rounded-xl text-[10px] uppercase hover:bg-blue-400 transition-all disabled:opacity-20"
          >
            {loading ? '...' : 'Send'}
          </button>
        </form>
      </footer>
    </div>
  );
};

export default App;

// import React, { useState, useEffect, useCallback, useRef } from 'react';
// import { initializeApp } from 'firebase/app';
// import { 
//   getAuth, 
//   signInAnonymously, 
//   onAuthStateChanged 
// } from 'firebase/auth'; 
// import { 
//   getFirestore, 
//   collection, 
//   query, 
//   onSnapshot, 
//   serverTimestamp, 
//   doc,
//   writeBatch
// } from 'firebase/firestore';

// // Note: The __app_id and __firebase_config variables are provided by the canvas environment.

// // --- Firebase Configuration & Constants ---
// const LOCAL_FIREBASE_CONFIG = {
//   apiKey: "AIzaSyC2DvgvS7Qx77RUsE4pfE6HAwABiFvEJn8",
//   authDomain: "aios-v001.firebaseapp.com",
//   projectId: "aios-v001",
//   storageBucket: "aios-v001.firebasestorage.app",
//   messagingSenderId: "571083906540",
//   appId: "1:571083906540:web:7cafb4a8a96877560fb4c9",
//   measurementId: "G-E3P5VV3K69"
// };
// const LOCAL_APP_ID = 'local-canvas-chat'; 

// const firebaseConfig = LOCAL_FIREBASE_CONFIG;
// const appId = LOCAL_APP_ID;

// const API_KEY = ""; // Leave as empty string for Canvas environment
// const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${API_KEY}`;
// const MAX_RETRIES = 3;


// // --- Utility Functions & AIos Schema ---

// // Helper function to get the public collection path for the chat
// const getChatCollectionPath = () => {
//   return `artifacts/${appId}/public/data/messages`;
// };

// // JSON Schema to force the LLM to output a structured tool-call intent
// const ORCHESTRATION_SCHEMA = {
//   type: "OBJECT",
//   properties: {
//     intent: {
//       type: "STRING",
//       // CRITICAL UPDATE: 'google_search' is replaced by 'gemini_response'
//       description: "The primary intent or tool required: 'calendar_tool', 'communication_tool', 'image_generation', 'gemini_response', or 'general_chat'."
//     },
//     tool_triggered: {
//       type: "STRING",
//       description: "A friendly name for the tool that was triggered (e.g., 'Calendar API', 'Email Draft', 'Imagen Tool', 'Gemini Responder')."
//     },
//     arguments: {
//       type: "OBJECT",
//       description: "Key-value pairs representing the arguments for the selected tool.",
//       properties: {
//         query: { type: "STRING", description: "The original user query or a brief summary of the task." }
//       }
//     }
//   },
//   required: ["intent", "tool_triggered", "arguments"]
// };

// /**
//  * Calls the Gemini API for the initial Intent Classification (Orchestration Agent/gNode).
//  * Implements exponential backoff for reliability.
//  */
// const callGeminiOrchestrator = async (userQuery) => {
//   // Updated system prompt to use 'gemini_response'
//   const systemPrompt = `You are the AIos Orchestration Agent (gNode). Your sole purpose is to analyze the user's request and categorize it into one of the following high-level intents: 'calendar_tool' (for scheduling, meetings, or time-related tasks), 'communication_tool' (for drafting emails, messages, or reports), 'image_generation' (for creating visual assets), 'gemini_response' (for queries requiring up-to-date web information or complex, multi-paragraph answers), or 'general_chat' (for all other simple conversational queries). Do not generate any text outside of the JSON structure.`;
  
//   const payload = {
//     contents: [{ parts: [{ text: userQuery }] }],
//     systemInstruction: { parts: [{ text: systemPrompt }] },
//     generationConfig: {
//       responseMimeType: "application/json",
//       responseSchema: ORCHESTRATION_SCHEMA
//     }
//   };

//   let delay = 1000; 

//   for (let i = 0; i < MAX_RETRIES; i++) {
//     try {
//       const response = await fetch(API_URL, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(payload)
//       });

//       if (response.ok) {
//         const result = await response.json();
//         const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        
//         if (jsonText) {
//           return JSON.parse(jsonText);
//         } else {
//           console.error("Gemini orchestration response lacked structured content:", result);
//           return { intent: "error", tool_triggered: "System Error", arguments: { query: "Failed to parse LLM response." } };
//         }
//       } else if (response.status === 429 || response.status >= 500) {
//         if (i < MAX_RETRIES - 1) {
//           await new Promise(r => setTimeout(r, delay));
//           delay *= 2; 
//           continue; 
//         } else {
//           throw new Error(`Orchestrator API returned status ${response.status} after ${MAX_RETRIES} attempts.`);
//         }
//       } else {
//         throw new Error(`Orchestrator API returned status ${response.status}`);
//       }

//     } catch (error) {
//       if (i < MAX_RETRIES - 1 && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
//         await new Promise(r => setTimeout(r, delay));
//         delay *= 2;
//         continue;
//       }
//       console.error("Fatal Error calling Gemini Orchestrator API:", error);
//       throw new Error(error.message || "Unknown API error.");
//     }
//   }

//   return { intent: "error", tool_triggered: "API Timeout", arguments: { query: "API call timed out after multiple retries." } };
// };

// /**
//  * Secondary LLM call: Generates a natural language response using Google Search grounding (Execution Node).
//  */
// const callGeminiResponseGenerator = async (userQuery, intent) => {
//   const systemPrompt = intent === 'gemini_response' 
//     ? "Act as a helpful, grounded assistant. Use Google Search to find current, factual information to answer the user's query concisely and accurately. Include citation links if they are returned by the API."
//     : "Act as a helpful assistant, providing a concise, conversational answer.";

//   const payload = {
//     contents: [{ parts: [{ text: userQuery }] }],
//     systemInstruction: { parts: [{ text: systemPrompt }] },
//     // Enable Google Search grounding only for the 'gemini_response' intent (factual/search queries)
//     tools: intent === 'gemini_response' ? [{ "google_search": {} }] : undefined,
//   };

//   let delay = 1000;
//   for (let i = 0; i < MAX_RETRIES; i++) {
//     try {
//       const response = await fetch(API_URL, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(payload)
//       });

//       if (response.ok) {
//         const result = await response.json();
//         const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
        
//         if (text) {
//           // Process citations if available (only for search-grounded calls)
//           const groundingMetadata = result.candidates?.[0]?.groundingMetadata;
//           let citations = '';
//           if (groundingMetadata && groundingMetadata.groundingAttributions) {
//              const sources = groundingMetadata.groundingAttributions
//                 .map(attr => attr.web?.title || attr.web?.uri)
//                 .filter(Boolean)
//                 .slice(0, 3); 
              
//               if (sources.length > 0) {
//                   citations = '\n\n**Sources:** ' + sources.join(', ');
//               }
//           }
//           return text + citations;

//         } else {
//           return "Gemini failed to generate a response (no text returned).";
//         }
//       } else if (response.status === 429 || response.status >= 500) {
//         if (i < MAX_RETRIES - 1) {
//           await new Promise(r => setTimeout(r, delay));
//           delay *= 2;
//           continue;
//         } else {
//           throw new Error(`Response Generator API returned status ${response.status} after ${MAX_RETRIES} attempts.`);
//         }
//       } else {
//         throw new Error(`Response Generator API returned status ${response.status}`);
//       }

//     } catch (error) {
//       if (i < MAX_RETRIES - 1 && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
//         await new Promise(r => setTimeout(r, delay));
//         delay *= 2;
//         continue;
//       }
//       console.error("Fatal Error calling Response Generator API:", error);
//       throw new Error(`Response Generator failed: ${error.message}`);
//     }
//   }

//   return "API call to the Response Generator timed out.";
// };


// // --- Main App Component ---

// const App = () => {
//   const [db, setDb] = useState(null);
//   const [auth, setAuth] = useState(null);
//   const [userId, setUserId] = useState(null);
//   const [isAuthReady, setIsAuthReady] = useState(false);
//   const [messages, setMessages] = useState([]);
//   const [newMessage, setNewMessage] = useState('');
//   const [error, setError] = useState(null);
//   const [isSending, setIsSending] = useState(false);
//   const messagesEndRef = useRef(null);

//   // Function to scroll to the bottom of the message list
//   const scrollToBottom = () => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   };

//   // 1. Initialization and Authentication
//   useEffect(() => {
//     try {
//       if (!Object.keys(firebaseConfig).length || firebaseConfig.apiKey === "YOUR_API_KEY") {
//         console.warn("Firebase configuration is missing. Please update LOCAL_FIREBASE_CONFIG.");
//         setError("Firebase Config Missing. Please check console.");
//         return;
//       }

//       const app = initializeApp(firebaseConfig);
//       const firestore = getFirestore(app);
//       const firebaseAuth = getAuth(app);
      
//       setDb(firestore);
//       setAuth(firebaseAuth);

//       const unsubscribeAuth = onAuthStateChanged(firebaseAuth, (user) => {
//         if (user) {
//           setUserId(user.uid);
//           setIsAuthReady(true);
//         } else {
//           signInAnonymously(firebaseAuth)
//             .then((credential) => {
//               setUserId(credential.user.uid);
//               setIsAuthReady(true);
//             })
//             .catch((e) => {
//               console.error("Authentication Error:", e);
//               setError("Failed to authenticate anonymously. Check console for details.");
//               setIsAuthReady(true); 
//             });
//         }
//       });

//       return () => unsubscribeAuth();

//     } catch (e) {
//       console.error("Firebase Initialization Error:", e);
//       setError("Failed to initialize Firebase.");
//       setIsAuthReady(true);
//     }
//   }, []);

//   // 2. Real-time Data Listener (Snapshot)
//   useEffect(() => {
//     if (!db || !isAuthReady || !userId) {
//       return;
//     }
    
//     const collectionPath = getChatCollectionPath();
//     const messagesCollectionRef = collection(db, collectionPath);
    
//     const q = query(messagesCollectionRef);

//     const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
//       const newMessages = snapshot.docs.map(doc => ({
//         id: doc.id,
//         ...doc.data()
//       }));

//       newMessages.sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));

//       setMessages(newMessages);
//     }, (err) => {
//       console.error("Firestore Snapshot Error:", err);
//       setError("Failed to load messages due to permissions or connection error.");
//     });

//     return () => unsubscribeSnapshot();
    
//   }, [db, isAuthReady, userId]); 

//   // 3. Auto-scroll whenever messages update
//   useEffect(() => {
//     scrollToBottom();
//   }, [messages]);

//   // 4. Handle sending a new message and triggering the REAL AIos response
//   const handleSend = useCallback(async () => {
//     const textToSend = newMessage.trim();
//     if (!db || !userId || !textToSend || isSending) return;

//     setIsSending(true);
//     setError(null);

//     // 1. Prepare User Message (Event Message)
//     const userMessageData = {
//       text: textToSend,
//       userId: userId,
//       timestamp: serverTimestamp(),
//       type: 'user_query', 
//       userDisplayId: userId.substring(0, 8) 
//     };

//     // 2. Call the real Gemini Orchestrator
//     let orchestrationResult;
//     try {
//         orchestrationResult = await callGeminiOrchestrator(textToSend);
//     } catch (e) {
//         // Fallback for API failure (catches the re-thrown error from the orchestrator)
//         orchestrationResult = { intent: "error", tool_triggered: "API Failure", arguments: { query: e.message } };
//     }
    
//     const { intent, tool_triggered, arguments: { query: querySummary } } = orchestrationResult;

//     // 3. Construct the AIos System Message based on the LLM's structured output
//     let finalResponse;
//     const orchestrationSummary = `Intent Classified: **${intent}**. Tool: ${tool_triggered}. Summary: "${querySummary}".`;

//     if (intent === 'error') {
//         finalResponse = `Orchestration Failure: ${tool_triggered}. Details: ${querySummary}`;
//     } else if (intent === 'general_chat' || intent === 'gemini_response') {
//         // Step 3b: Handle Conversational/Search Intents (Call the second LLM)
//         try {
//             const answer = await callGeminiResponseGenerator(textToSend, intent);
//             finalResponse = orchestrationSummary + '\n\n--- AIos Response ---\n' + answer;
//         } catch (e) {
//             finalResponse = orchestrationSummary + '\n\n--- Response Generation Failed ---\n' + `Error: ${e.message}`;
//         }
        
//     } else {
//         // Step 3c: Handle Specific Tool Intents (Mocked UI generation)
//         finalResponse = orchestrationSummary + `\n\n**Tool Execution Mock:** The UI would now transition to the generated application form for ${tool_triggered}.`;
//     }
    
//     const aiResponseData = {
//       text: finalResponse,
//       userId: 'AIos_gNode', 
//       timestamp: serverTimestamp(),
//       type: intent, 
//       isSystem: true, 
//       userDisplayId: 'AIos Core'
//     };

//     // 4. Use a batch write for atomic update
//     const batch = writeBatch(db);
//     const messagesCollectionRef = collection(db, getChatCollectionPath());
    
//     const userDocRef = doc(messagesCollectionRef);
//     batch.set(userDocRef, userMessageData);

//     const aiDocRef = doc(messagesCollectionRef);
//     batch.set(aiDocRef, aiResponseData);

//     batch.commit().catch(e => {
//          console.error("Firestore Batch Write Error:", e);
//          setError("Failed to send message: " + e.message);
//     }).finally(() => {
//          setIsSending(false);
//     });

//     setNewMessage('');

//   }, [db, userId, newMessage, isSending]);

//   const ChatMessage = ({ message, isCurrentUser }) => {
//     const isSystem = message.isSystem;
//     const isIntent = isSystem && message.type && message.type !== 'general_chat' && message.type !== 'user_query';

//     let bubbleClasses = '';
//     let headerText = '';
//     let headerClasses = 'font-semibold text-xs opacity-80 mb-1';

//     if (isSystem) {
//         // AIos System Message Styling (gNode interpretation)
//         bubbleClasses = 'bg-green-100 text-gray-800 rounded-xl rounded-tl-none border border-green-300 shadow-md whitespace-pre-wrap';
//         headerText = 'AIos Core (gNode)';
//         headerClasses = 'font-bold text-green-700 text-xs mb-1';
//     } else if (isCurrentUser) {
//         // Current User Styling
//         bubbleClasses = 'bg-blue-600 text-white rounded-xl rounded-br-none shadow-md';
//         headerText = 'You';
//     } else {
//         // Other User Styling (unused in this 1:1 demo but good practice)
//         bubbleClasses = 'bg-gray-100 text-gray-800 rounded-xl rounded-tl-none border border-gray-200 shadow-sm';
//         headerText = `User ID: ${message.userDisplayId || 'Guest'}`;
//     }
    
//     // Simple markdown conversion for bold tool names
//     const renderedText = message.text.split('**').map((part, index) => {
//       // Parts at odd indices are inside the double asterisks (bold)
//       return index % 2 === 1 ? <strong key={index}>{part}</strong> : part;
//     });


//     return (
//         <div className={`flex mb-4 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
//           <div 
//             className={`max-w-xs lg:max-w-md px-4 py-3 transition-all duration-300 ease-in-out ${bubbleClasses}`}
//           >
//             <div className={headerClasses}>
//               {headerText}
//               {isIntent && <span className="ml-2 px-1.5 py-0.5 bg-yellow-400 text-yellow-900 rounded-full text-[10px] font-extrabold shadow-sm">INTENT</span>}
//             </div>
//             {/* Using white-space pre-wrap to respect newlines from the multi-step response */}
//             <p className="text-sm break-words whitespace-pre-wrap">{renderedText}</p> 
//             <span className={`text-xs block mt-1 ${isCurrentUser ? 'text-blue-200 opacity-75' : 'text-gray-500'}`}>
//               {message.timestamp?.toDate().toLocaleTimeString() || (isSending ? 'Sending...' : 'Processing...')}
//             </span>
//           </div>
//         </div>
//       );
//   };

//   return (
//     <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4 font-inter">
//       <div className="w-full max-w-2xl bg-white shadow-2xl rounded-xl flex flex-col h-[85vh] overflow-hidden">
        
//         {/* Header */}
//         <div className="p-4 bg-gray-800 text-white rounded-t-xl shadow-md">
//           <h1 className="text-xl font-bold">AIos Orchestration Demo (Live LLM)</h1>
//           <p className="text-sm opacity-75 mt-1 truncate">
//             {isAuthReady 
//               // ? `Your Full User ID: ${userId}` 
//               ? `Your Full User ID: ${"test_user001"}` 
//               : 'Authenticating...'
//             }
//           </p>
//         </div>

//         {/* Error Display */}
//         {error && (
//           <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded m-4" role="alert">
//             <p className="font-bold">Error</p>
//             <p className="text-sm">{error}</p>
//             <p className="text-xs mt-1">Check Firebase Auth (Anonymous) and Firestore Rules.</p>
//           </div>
//         )}

//         {/* Message Area */}
//         <div className="flex-grow p-4 overflow-y-auto space-y-4 bg-gray-50" id="message-list">
//           {isAuthReady && messages.length === 0 && (
//             <div className="text-center text-gray-500 mt-10">
//               Welcome to AIos. Try queries like "Schedule a meeting for Friday" or "Draft a quick note to my boss."
//             </div>
//           )}
          
//           {!isAuthReady && (
//             <div className="text-center text-gray-500 mt-10">
//               Connecting to chat server...
//             </div>
//           )}

//           {messages.map((msg) => (
//             <ChatMessage
//               key={msg.id}
//               message={msg}
//               isCurrentUser={msg.userId === userId}
//             />
//           ))}
//           {/* Ref to scroll to the latest message */}
//           <div ref={messagesEndRef} />
//         </div>

//         {/* Input Area */}
//         <div className="p-4 border-t bg-white flex space-x-3">
//           <input
//             type="text"
//             className="flex-grow p-3 border border-gray-300 rounded-full focus:ring-blue-500 focus:border-blue-500 transition duration-150"
//             placeholder="Type your query (e.g., 'Draft an email')..."
//             value={newMessage}
//             onChange={(e) => setNewMessage(e.target.value)}
//             onKeyDown={(e) => {
//               if (e.key === 'Enter' && !isSending) {
//                 handleSend();
//               }
//             }}
//             disabled={!db || !isAuthReady || isSending}
//           />
//           <button
//             className={`p-3 rounded-full text-white font-bold shadow-md transition duration-200 ease-in-out 
//               ${!db || !isAuthReady || isSending || !newMessage.trim() 
//                 ? 'bg-blue-300 cursor-not-allowed' 
//                 : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
//               }`
//             }
//             onClick={handleSend}
//             disabled={!db || !isAuthReady || isSending || !newMessage.trim()}
//           >
//             {isSending ? (
//               <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//               </svg>
//             ) : (
//               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
//                 <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
//               </svg>
//             )}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default App;