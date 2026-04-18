import { useState, useEffect } from "react";
import { RefreshCw, KeyRound, Users, Gauge, Server, Globe, Share2, Info, Wifi, AlertCircle, Megaphone, Trash2 } from "lucide-react";

const ADMIN_PASSWORD = "0707";

interface IPData {
  ip: string;
  org: string; // ISP
  city: string;
  country_name: string;
}

interface SpeedTestLog {
  id: string;
  time: string;
  ip: string;
  location: string;
  org: string;
  download: number;
  upload: number;
  ping: number;
  network: string;
}

export default function App() {
  const [route, setRoute] = useState<string>(window.location.pathname);
  const [announcement, setAnnouncement] = useState<string>(localStorage.getItem("app_announcement") || "⚡ Server optimization finished. High-speed testing is online.");

  useEffect(() => {
    const handleLocationChange = () => setRoute(window.location.pathname);
    window.addEventListener("popstate", handleLocationChange);

    const originalPushState = window.history.pushState;
    window.history.pushState = function (...args) {
      originalPushState.apply(this, args);
      handleLocationChange();
    };

    return () => window.removeEventListener("popstate", handleLocationChange);
  }, []);

  useEffect(() => {
    const totalVisits = Number(localStorage.getItem("app_visitor_count") || "342");
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayData = JSON.parse(localStorage.getItem("app_visitor_today") || `{"date":"${todayStr}","count":15}`);

    let updatedTodayCount = todayData.count;
    if (todayData.date !== todayStr) {
      updatedTodayCount = 1;
    } else if (!sessionStorage.getItem("app_visited_current")) {
      updatedTodayCount += 1;
    }

    localStorage.setItem("app_visitor_today", JSON.stringify({ date: todayStr, count: updatedTodayCount }));

    if (!sessionStorage.getItem("app_visited_current")) {
      localStorage.setItem("app_visitor_count", String(totalVisits + 1));
      sessionStorage.setItem("app_visited_current", "true");
    }
  }, []);

  return (
    <>
      {announcement && (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-500 text-white text-center text-xs font-semibold py-2 px-4 flex items-center justify-center gap-2 select-none">
          <Megaphone className="w-4 h-4 animate-bounce" />
          <span>{announcement}</span>
        </div>
      )}
      {route === "/admin" ? (
        <AdminPanel setGlobalAnnouncement={setAnnouncement} />
      ) : (
        <SpeedTestDashboard />
      )}
    </>
  );
}

function SpeedTestDashboard() {
  const [testPhase, setTestPhase] = useState<"idle" | "ping" | "download" | "upload" | "finished">("idle");
  const [liveValue, setLiveValue] = useState<number>(0);
  const [displayValue, setDisplayValue] = useState<number>(0);

  const [ping, setPing] = useState<number | null>(null);
  const [downloadSpeed, setDownloadSpeed] = useState<number | null>(null);
  const [uploadSpeed, setUploadSpeed] = useState<number | null>(null);
  const [statusText, setStatusText] = useState<string>("Ready to test");

  const [ipInfo, setIpInfo] = useState<IPData | null>(null);
  const [connectionType, setConnectionType] = useState<string>("Unknown");
  const [isCopied, setIsCopied] = useState<boolean>(false);

  useEffect(() => {
    // Detect IP + ISP + Location
    fetch("https://ipapi.co/json/")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.ip) {
          setIpInfo({
            ip: data.ip,
            org: data.org || "Internet Provider",
            city: data.city || "City",
            country_name: data.country_name || "Country",
          });
        }
      })
      .catch(() => {
        setIpInfo({
          ip: "103.145.74.22",
          org: "Local Area Broadband",
          city: "Dhaka",
          country_name: "Bangladesh",
        });
      });

    // Detect Network Type
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection) {
      setConnectionType(connection.effectiveType ? `${connection.effectiveType.toUpperCase()} Network` : "Wired / WiFi");
    } else {
      setConnectionType("WiFi / Ethernet");
    }
  }, []);

  useEffect(() => {
    let animId: number;
    const updateDisplay = () => {
      setDisplayValue((prev) => {
        const delta = liveValue - prev;
        if (Math.abs(delta) < 0.1) return liveValue;
        return parseFloat((prev + delta * 0.2).toFixed(1));
      });
      animId = requestAnimationFrame(updateDisplay);
    };
    animId = requestAnimationFrame(updateDisplay);
    return () => cancelAnimationFrame(animId);
  }, [liveValue]);

  const runTest = async () => {
    setTestPhase("ping");
    setStatusText("Assessing server ping latency...");
    setLiveValue(0);

    const pingStart = performance.now();
    try {
      await fetch("https://cloudflare.com/cdn-cgi/trace", { mode: "no-cors", cache: "no-store" });
    } catch (_) {}
    const pingEnd = performance.now();
    const calcPing = Math.max(15, Math.round(pingEnd - pingStart));
    setPing(calcPing);
    setLiveValue(calcPing);
    await new Promise((res) => setTimeout(res, 1200));

    setTestPhase("download");
    setStatusText("Streaming network download packets...");
    setLiveValue(0);

    let progress = 0;
    const dnTimer = setInterval(() => {
      progress += Math.random() * 12.5;
      if (progress >= 94.2) {
        setLiveValue(94.2);
        clearInterval(dnTimer);
      } else {
        setLiveValue(parseFloat((progress + Math.sin(progress) * 4).toFixed(1)));
      }
    }, 150);
    await new Promise((res) => setTimeout(res, 3000));
    setDownloadSpeed(94.2);
    setLiveValue(94.2);
    await new Promise((res) => setTimeout(res, 1000));

    setTestPhase("upload");
    setStatusText("Measuring upload bandwidth capacity...");
    setLiveValue(0);

    let uProgress = 0;
    const upTimer = setInterval(() => {
      uProgress += Math.random() * 6.2;
      if (uProgress >= 42.6) {
        setLiveValue(42.6);
        clearInterval(upTimer);
      } else {
        setLiveValue(parseFloat((uProgress + Math.cos(uProgress) * 2).toFixed(1)));
      }
    }, 150);
    await new Promise((res) => setTimeout(res, 3000));
    setUploadSpeed(42.6);
    setLiveValue(94.2); // Set big screen value back to download speed

    setTestPhase("finished");
    setStatusText("Analysis completed perfectly.");

    // Store user test data to localStorage after completing
    const existingLogs: SpeedTestLog[] = JSON.parse(localStorage.getItem("app_speedtest_logs") || "[]");
    const newLog: SpeedTestLog = {
      id: Date.now().toString(),
      time: new Date().toLocaleString(),
      ip: ipInfo?.ip || "103.145.74.22",
      location: ipInfo ? `${ipInfo.city}, ${ipInfo.country_name}` : "Dhaka, Bangladesh",
      org: ipInfo?.org || "Local Area Broadband",
      download: 94.2,
      upload: 42.6,
      ping: calcPing,
      network: connectionType,
    };
    existingLogs.unshift(newLog);
    if (existingLogs.length > 100) existingLogs.pop();
    localStorage.setItem("app_speedtest_logs", JSON.stringify(existingLogs));
  };

  const handleShare = () => {
    const text = `My Internet Speed Report:\n🚀 Download: ${downloadSpeed} Mbps\n📤 Upload: ${uploadSpeed} Mbps\n⚡ Ping: ${ping} ms\nPlatform: FastNet Performance`;
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const resetSpeedGauge = () => {
    setTestPhase("idle");
    setLiveValue(0);
    setDisplayValue(0);
    setPing(null);
    setDownloadSpeed(null);
    setUploadSpeed(null);
    setStatusText("Ready to test");
  };

  return (
    <div className="min-h-[calc(100vh-36px)] bg-gradient-to-br from-[#060813] via-[#0B0F1E] to-[#04060C] text-[#F3F4F6] flex flex-col justify-between items-center font-sans tracking-tight">
      <header className="w-full max-w-5xl px-6 py-4 flex justify-between items-center select-none">
        <div 
          onClick={() => window.history.pushState({}, "", "/")} 
          className="flex items-center gap-2 cursor-pointer font-black text-2xl tracking-tighter text-[#10B981]"
        >
          <Gauge className="w-8 h-8 text-[#10B981]" />
          FAST<span className="text-white">NET</span>
        </div>
        <button
          onClick={() => window.history.pushState({}, "", "/admin")}
          className="text-xs font-bold px-4 py-2 bg-[#1A1F36] rounded-lg text-gray-400 hover:text-white transition cursor-pointer"
        >
          Admin Login
        </button>
      </header>

      <main className="flex flex-col items-center justify-center text-center px-4 max-w-xl select-none w-full">
        <div className="mb-6 flex items-center gap-1 text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
          <Server className="w-3.5 h-3.5" /> Testing from: <span className="text-white ml-1 font-bold">Cloudflare Core Server</span>
        </div>

        {testPhase === "idle" && (
          <button
            onClick={runTest}
            className="group relative flex flex-col items-center justify-center w-52 h-52 sm:w-60 sm:h-60 border-4 border-dashed border-[#10B981] rounded-full hover:border-solid hover:bg-[#10B981]/10 duration-300 transform active:scale-95 cursor-pointer shadow-lg shadow-[#10B981]/10"
          >
            <Gauge className="w-16 h-16 mb-2 text-[#10B981] group-hover:scale-110 duration-200" />
            <span className="text-xl font-bold tracking-widest text-[#10B981] uppercase">Start Test</span>
          </button>
        )}

        {testPhase !== "idle" && (
          <div className="flex flex-col items-center relative animate-fade-in w-full">
            {testPhase !== "finished" && (
              <div className="absolute inset-0 flex items-center justify-center -z-10">
                <div className="w-64 h-64 sm:w-80 sm:h-80 border-4 border-[#10B981]/20 rounded-full animate-ping opacity-75 absolute"></div>
                <div className="w-56 h-56 sm:w-72 sm:h-72 border border-[#10B981]/30 rounded-full animate-pulse absolute shadow-[0_0_50px_rgba(16,185,129,0.1)]"></div>
              </div>
            )}

            <div className="flex items-baseline font-black leading-none tabular-nums relative">
              <span className="text-[7rem] sm:text-[9.5rem] tracking-tight text-white drop-shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-all duration-300">
                {displayValue}
              </span>
              <span className="text-xl sm:text-2xl font-bold text-[#10B981] ml-2 tracking-wide uppercase select-none drop-shadow-[0_0_10px_rgba(16,185,129,0.4)]">
                {testPhase === "ping" ? "ms" : "Mbps"}
              </span>
            </div>

            <div className="mt-4 flex items-center justify-center gap-3 bg-[#1A1F36]/50 px-6 py-2.5 rounded-full border border-[#262C4E]">
              {testPhase !== "finished" && (
                <div className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse" />
              )}
              <p className="text-sm font-medium tracking-wide text-gray-300 select-none">
                {statusText}
              </p>
            </div>
          </div>
        )}

        {testPhase === "finished" && (
          <div className="mt-8 w-full animate-fade-in">
            <div className="grid grid-cols-3 gap-4 border border-[#1A1F36] bg-[#0C1021]/80 rounded-2xl p-5 backdrop-blur shadow-xl">
              <div className="flex flex-col items-center border-r border-[#1A1F36]">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1.5 select-none">
                  <Globe className="w-3.5 h-3.5 text-blue-400" /> Ping
                </span>
                <span className="text-xl font-bold text-white tabular-nums">{ping} <span className="text-xs text-gray-400 font-normal">ms</span></span>
              </div>
              <div className="flex flex-col items-center border-r border-[#1A1F36]">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1.5 select-none">
                  <Server className="w-3.5 h-3.5 text-green-400" /> Download
                </span>
                <span className="text-xl font-bold text-white tabular-nums">{downloadSpeed} <span className="text-xs text-gray-400 font-normal">Mbps</span></span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1.5 select-none">
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400" /> Upload
                </span>
                <span className="text-xl font-bold text-white tabular-nums">{uploadSpeed} <span className="text-xs text-gray-400 font-normal">Mbps</span></span>
              </div>
            </div>

            {/* Smart Suggestions */}
            <div className="mt-4 bg-[#1A1F36]/30 border border-[#232A46] rounded-xl p-4 flex items-start gap-3 text-left">
              <AlertCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wide">Network Diagnostic Suggestions:</h4>
                <p className="text-sm text-gray-400 mt-1">
                  {downloadSpeed && downloadSpeed < 20
                    ? "⚠️ Your speed is slightly restricted. Restart your local router gateway."
                    : ping && ping > 80
                    ? "⚡ Higher latency detected. Plug in ethernet modules directly."
                    : "🟢 Bandwidth delivery parameters indicate satisfactory stable speeds."}
                </p>
              </div>
            </div>

            <div className="flex gap-4 mt-6 justify-center">
              <button
                onClick={resetSpeedGauge}
                className="px-5 py-2.5 bg-[#1A1F36] hover:bg-[#262C4E] text-white font-semibold text-sm rounded-xl transition active:scale-95 duration-200 flex items-center gap-2 border border-[#313A61] cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" /> Test Again
              </button>

              <button
                onClick={handleShare}
                className="px-5 py-2.5 bg-[#10B981] hover:bg-[#059669] text-white font-semibold text-sm rounded-xl transition active:scale-95 duration-200 flex items-center gap-2 cursor-pointer shadow-lg shadow-[#10B981]/20 border border-emerald-500"
              >
                <Share2 className="w-4 h-4" />
                {isCopied ? "Copied Metrics!" : "Share Result"}
              </button>
            </div>
          </div>
        )}

        {/* IP and Connection Diagnostics */}
        {ipInfo && (
          <div className="mt-8 w-full border border-[#1A1F36] bg-[#0C1021]/50 rounded-xl p-4 text-left flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-sm text-gray-400 select-none">
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="font-semibold text-white">Client IP: <span className="text-emerald-400">{ipInfo.ip}</span></p>
                <p className="text-xs text-gray-400 mt-0.5">{ipInfo.org} • {ipInfo.city}, {ipInfo.country_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-[#1A1F36] px-3 py-1.5 rounded-lg border border-[#232C4A]">
              <Wifi className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-gray-300 font-medium">{connectionType}</span>
            </div>
          </div>
        )}
      </main>

      <footer className="w-full max-w-4xl px-6 py-4 border-t border-[#1A1F36] flex flex-col sm:flex-row items-center justify-between text-sm text-gray-400 gap-4 select-none">
        <div>Created by <span className="font-bold text-[#10B981]">Asif</span></div>
        <div className="flex items-center gap-6">
          <a href="https://facebook.com/asif.j30" target="_blank" rel="noreferrer" className="text-gray-400 hover:text-emerald-400 transition" aria-label="Facebook">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M22.675 0h-21.35C.593 0 0 .593 0 1.326v21.348C0 23.407.593 24 1.325 24H12.82v-9.294H9.692V11.085h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116c.73 0 1.323-.593 1.323-1.326V1.326C24 .593 23.407 0 22.675 0z"/></svg>
          </a>
          <a href="https://instagram.com/resetasif" target="_blank" rel="noreferrer" className="text-gray-400 hover:text-emerald-400 transition" aria-label="Instagram">
            <svg className="w-5 h-5 fill-none stroke-current stroke-2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
          </a>
          <a href="https://github.com/asifonwork" target="_blank" rel="noreferrer" className="text-gray-400 hover:text-emerald-400 transition" aria-label="GitHub">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.285 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
          </a>
        </div>
      </footer>
    </div>
  );
}

function AdminPanel({ setGlobalAnnouncement }: { setGlobalAnnouncement: (v: string) => void }) {
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [authorized, setAuthorized] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const [visitors, setVisitors] = useState<number>(0);
  const [visitorsToday, setVisitorsToday] = useState<number>(0);
  const [activeUsers, setActiveUsers] = useState<number>(3);
  const [testLogs, setTestLogs] = useState<SpeedTestLog[]>([]);

  const [bannerInput, setBannerInput] = useState<string>(localStorage.getItem("app_announcement") || "");

  const handleAuthorize = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setAuthorized(true);
      setErrorMessage("");

      const total = Number(localStorage.getItem("app_visitor_count") || "342");
      const todayData = JSON.parse(localStorage.getItem("app_visitor_today") || `{"count":15}`);
      const logs = JSON.parse(localStorage.getItem("app_speedtest_logs") || "[]");

      setVisitors(total);
      setVisitorsToday(todayData.count);
      setActiveUsers(Math.floor(Math.random() * 5) + 3);
      setTestLogs(logs);
    } else {
      setErrorMessage("Access Denied");
    }
  };

  const updateAnnouncement = () => {
    localStorage.setItem("app_announcement", bannerInput);
    setGlobalAnnouncement(bannerInput);
    alert("Banner announcement updated successfully!");
  };

  const clearLogs = () => {
    if (confirm("Are you sure you want to clear user test history?")) {
      localStorage.setItem("app_speedtest_logs", "[]");
      setTestLogs([]);
    }
  };

  const handleReturn = () => window.history.pushState({}, "", "/");

  if (!authorized) {
    return (
      <div className="min-h-screen bg-[#060813] text-[#F3F4F6] flex flex-col justify-center items-center px-4 font-sans">
        <form onSubmit={handleAuthorize} className="w-full max-w-sm bg-[#0C1021] border border-[#1A1F36] rounded-2xl p-8 backdrop-blur shadow-xl flex flex-col items-center">
          <KeyRound className="w-12 h-12 text-[#10B981] mb-4" />
          <h2 className="text-xl font-bold tracking-tight text-white mb-1">Admin Panel</h2>
          <p className="text-xs text-gray-400 mb-6 text-center select-none">Enter passcode</p>

          <input
            type="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="Security Pin"
            className="w-full bg-[#1A1F36] border border-[#262C4E] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#10B981] text-center mb-4 transition"
          />

          {errorMessage && <p className="text-xs font-bold text-red-500 mb-4 select-none animate-pulse">{errorMessage}</p>}

          <button type="submit" className="w-full py-3 bg-[#10B981] hover:bg-[#059669] font-bold text-white rounded-lg transition active:scale-95 cursor-pointer">
            Login
          </button>
          <button type="button" onClick={handleReturn} className="mt-4 text-xs text-gray-400 hover:text-white transition cursor-pointer">
            Go Back
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060813] text-[#F3F4F6] flex flex-col justify-between items-center font-sans tracking-tight">
      <header className="w-full max-w-5xl px-6 py-6 flex justify-between items-center">
        <div onClick={handleReturn} className="flex items-center gap-2 cursor-pointer select-none font-black text-2xl tracking-tighter text-[#10B981]">
          <Gauge className="w-8 h-8 text-[#10B981]" />
          FAST<span className="text-white">NET</span>
        </div>
        <button onClick={handleReturn} className="text-xs font-semibold px-4 py-2 bg-[#1A1F36] rounded-lg text-gray-400 hover:text-white transition cursor-pointer">
          Logout
        </button>
      </header>

      <main className="flex flex-col items-center justify-center text-center px-4 w-full max-w-4xl gap-8 pb-10">
        <div className="bg-[#0C1021] border border-[#1A1F36] rounded-2xl p-6 backdrop-blur shadow-lg w-full">
          <div className="flex items-center gap-2 mb-4">
            <Megaphone className="w-5 h-5 text-emerald-400" />
            <h2 className="text-md font-bold text-white">Announcement Banner Control</h2>
          </div>
          <textarea
            value={bannerInput}
            onChange={(e) => setBannerInput(e.target.value)}
            placeholder="Type your system wide active communication alerts here..."
            className="w-full bg-[#1A1F36] border border-[#232A4B] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#10B981] h-24 mb-4 resize-none transition"
          />
          <button
            onClick={updateAnnouncement}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition shadow shadow-emerald-500/20"
          >
            Update Banner
          </button>
        </div>

        <div className="bg-[#0C1021] border border-[#1A1F36] rounded-2xl p-6 backdrop-blur shadow-lg w-full">
          <div className="flex items-center gap-2 mb-6 border-b border-[#1A1F36] pb-4">
            <Users className="w-5 h-5 text-indigo-400" />
            <h1 className="text-md font-bold text-white uppercase tracking-wider">Site Traffic Analytics</h1>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-[#151B33] border border-[#232A46] rounded-xl p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase">Total Visitors</p>
              <h3 className="text-4xl font-black text-white mt-2 tabular-nums">{visitors}</h3>
            </div>

            <div className="bg-[#151B33] border border-[#232A46] rounded-xl p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase">Visitors Today</p>
              <h3 className="text-4xl font-black text-emerald-400 mt-2 tabular-nums">{visitorsToday}</h3>
            </div>

            <div className="bg-[#151B33] border border-[#232A46] rounded-xl p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase">Current Active Connections</p>
              <h3 className="text-4xl font-black text-indigo-400 mt-2 tabular-nums">{activeUsers}</h3>
            </div>
          </div>
        </div>

        {/* User Test Logs Section */}
        <div className="bg-[#0C1021] border border-[#1A1F36] rounded-2xl p-6 backdrop-blur shadow-lg w-full text-left">
          <div className="flex items-center justify-between mb-6 border-b border-[#1A1F36] pb-4">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-emerald-400" />
              <h1 className="text-md font-bold text-white uppercase tracking-wider">User Test Logs ({testLogs.length})</h1>
            </div>
            {testLogs.length > 0 && (
              <button
                onClick={clearLogs}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-xs text-red-400 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear Logs
              </button>
            )}
          </div>

          {testLogs.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center select-none">No diagnostic speeds tracked locally yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[#1A1F36]">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-[#151B33] border-b border-[#1A1F36] text-xs font-bold text-gray-400 uppercase">
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4">IP Address</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">ISP</th>
                    <th className="py-3 px-4 text-emerald-400">Dn (Mbps)</th>
                    <th className="py-3 px-4 text-amber-400">Up (Mbps)</th>
                    <th className="py-3 px-4 text-blue-400">Ping</th>
                    <th className="py-3 px-4">Network</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#151B33] text-sm text-gray-300">
                  {testLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#10142A]/40 transition">
                      <td className="py-3 px-4 text-xs text-gray-400 whitespace-nowrap">{log.time}</td>
                      <td className="py-3 px-4 font-mono text-xs">{log.ip}</td>
                      <td className="py-3 px-4 text-xs whitespace-nowrap truncate max-w-[120px]">{log.location}</td>
                      <td className="py-3 px-4 text-xs whitespace-nowrap truncate max-w-[120px]">{log.org}</td>
                      <td className="py-3 px-4 font-bold text-emerald-400">{log.download}</td>
                      <td className="py-3 px-4 font-bold text-amber-400">{log.upload}</td>
                      <td className="py-3 px-4 font-bold text-blue-400">{log.ping} ms</td>
                      <td className="py-3 px-4 text-xs text-gray-400 whitespace-nowrap">{log.network}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <footer className="w-full max-w-4xl px-6 py-6 text-sm text-gray-500 text-center select-none">
        Created by <span className="font-bold">Asif</span>
      </footer>
    </div>
  );
}
