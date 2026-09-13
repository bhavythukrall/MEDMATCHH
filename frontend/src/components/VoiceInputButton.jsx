import { useRef, useState } from "react";
import { Button } from "./ui/button";
import { Mic, MicOff } from "lucide-react";
import { toast } from "sonner";
import { useT } from "../lib/i18n";

export default function VoiceInputButton({ onText, testId = "voice-input-button" }) {
  const { t, lang } = useT();
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);

  const toggle = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return toast.error(t("family.voiceUnsupported"));
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new SR();
    rec.lang = lang === "hi" ? "hi-IN" : "en-IN";
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e) => onText(Array.from(e.results).map((r) => r[0].transcript).join(" "));
    rec.onerror = () => { setListening(false); toast.error(t("family.voiceUnsupported")); };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  return (
    <Button
      type="button"
      size="lg"
      variant="outline"
      onClick={toggle}
      className={`h-14 text-lg border-2 ${listening ? "border-[color:var(--terracotta)] text-[color:var(--terracotta)] sos-pulse" : ""}`}
      data-testid={testId}
    >
      {listening ? <MicOff size={22} className="mr-2" /> : <Mic size={22} className="mr-2" />}
      {listening ? t("family.listening") : t("family.speak")}
    </Button>
  );
}
