import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Mic, Square, Play, Trash2, Loader2, Upload } from "lucide-react";

interface Recording {
  id: string;
  storage_path: string;
  duration_ms: number | null;
  created_at: string;
  student_id: string;
  signedUrl?: string;
}

interface Props {
  lessonId: string;
}

const BUCKET = "pronunciation-recordings";

function formatMs(ms: number | null) {
  if (!ms) return "—";
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function PronunciationRecorder({ lessonId }: Props) {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startedAtRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<number | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("pronunciation_recordings")
      .select("*")
      .eq("lesson_id", lessonId)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const withUrls = await Promise.all(
      (data ?? []).map(async (r) => {
        const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(r.storage_path, 3600);
        return { ...r, signedUrl: signed?.signedUrl } as Recording;
      })
    );
    setRecordings(withUrls);
    setLoading(false);
  };

  useEffect(() => {
    load();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  const start = async () => {
    if (!user) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const mr = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      mr.onstop = async () => {
        const durationMs = Date.now() - startedAtRef.current;
        const blob = new Blob(chunksRef.current, { type: mime });
        await upload(blob, mime, durationMs);
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };
      mr.start();
      mediaRef.current = mr;
      startedAtRef.current = Date.now();
      setElapsed(0);
      setRecording(true);
      tickRef.current = window.setInterval(() => setElapsed(Date.now() - startedAtRef.current), 250);
    } catch (err: any) {
      toast({
        title: "Microfone indisponível",
        description: err?.message ?? "Permita o acesso ao microfone e tente novamente.",
        variant: "destructive",
      });
    }
  };

  const stop = () => {
    mediaRef.current?.stop();
    setRecording(false);
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  const upload = async (blob: Blob, mime: string, durationMs: number) => {
    if (!user) return;
    setUploading(true);
    const ext = mime.includes("mp4") ? "m4a" : "webm";
    const path = `${user.id}/${lessonId}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, blob, {
      contentType: mime,
      upsert: false,
    });
    if (upErr) {
      toast({ title: "Falha no upload", description: upErr.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { error: insErr } = await supabase.from("pronunciation_recordings").insert({
      student_id: user.id,
      lesson_id: lessonId,
      storage_path: path,
      duration_ms: durationMs,
    });
    if (insErr) {
      await supabase.storage.from(BUCKET).remove([path]);
      toast({ title: "Erro ao salvar", description: insErr.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    toast({ title: "Gravação enviada!" });
    setUploading(false);
    load();
  };

  const remove = async (rec: Recording) => {
    await supabase.storage.from(BUCKET).remove([rec.storage_path]);
    await supabase.from("pronunciation_recordings").delete().eq("id", rec.id);
    load();
  };

  const canDelete = (r: Recording) => user?.id === r.student_id;
  const isStaff = role === "admin" || role === "teacher";

  return (
    <div className="mt-3 rounded-xl border border-border bg-muted/30 p-4 space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        {!recording ? (
          <Button onClick={start} disabled={uploading} size="sm" className="gap-2">
            <Mic className="w-4 h-4" /> Iniciar gravação
          </Button>
        ) : (
          <Button onClick={stop} variant="destructive" size="sm" className="gap-2">
            <Square className="w-4 h-4" /> Parar ({formatMs(elapsed)})
          </Button>
        )}
        {uploading && (
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <Upload className="w-3 h-3 animate-pulse" /> Enviando...
          </span>
        )}
        {recording && (
          <span className="text-xs text-destructive inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" /> Gravando
          </span>
        )}
      </div>

      <div>
        <h5 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
          {isStaff ? "Gravações dos alunos" : "Suas gravações"}
        </h5>
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin" /></div>
        ) : recordings.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Nenhuma gravação ainda.</p>
        ) : (
          <ul className="space-y-2">
            {recordings.map((r) => (
              <li key={r.id} className="flex items-center gap-3 bg-background rounded-lg p-2 border border-border">
                <Play className="w-4 h-4 text-muted-foreground shrink-0" />
                {r.signedUrl ? (
                  <audio controls src={r.signedUrl} className="h-8 flex-1 min-w-0" />
                ) : (
                  <span className="text-xs text-muted-foreground flex-1">Link expirado</span>
                )}
                <span className="text-xs text-muted-foreground whitespace-nowrap">{formatMs(r.duration_ms)}</span>
                {canDelete(r) && (
                  <Button variant="ghost" size="icon" onClick={() => remove(r)} className="h-8 w-8">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
