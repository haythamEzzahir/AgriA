import React, { useEffect, useMemo, useRef, useState } from 'react';

const CALL_DURATION_MS = 5000;

const farmerReport = {
  observation: 'الطماطم باينة محتاجة شوية ديال الما والتراب ناشف، خصوصا فالجهة اللي كاتشد الشمس بزاف.',
  advice: 'من الأحسن تسقي بكري فالصباح ولا مع العشية، وخلي السقي يكون بشوية بشوية باش الما يدخل مزيان للتربة.',
};

const timelineLabels = {
  idle: 'جاهز للتواصل',
  calling: 'جاري الاتصال',
  answered: 'مكالمة مباشرة',
  missed: 'رسالة صوتية',
  sent: 'تقرير مرسل',
};

function buildSpokenReport() {
  return `الملاحظة. ${farmerReport.observation} النصيحة. ${farmerReport.advice}`;
}

function MessagePreview() {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-white/95 p-4 text-right shadow-sm" dir="rtl">
      <div className="space-y-4 text-slate-800">
        <div>
          <p className="mb-1 font-bold text-emerald-800">📌 الملاحظة</p>
          <p className="leading-8">{farmerReport.observation}</p>
        </div>
        <div>
          <p className="mb-1 font-bold text-emerald-800">🌱 النصيحة</p>
          <p className="leading-8">{farmerReport.advice}</p>
        </div>
      </div>
    </div>
  );
}

export default function AIAssistant() {
  const [callState, setCallState] = useState('idle');
  const [farmerAnswered, setFarmerAnswered] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messageSent, setMessageSent] = useState(false);
  const [demoChannel, setDemoChannel] = useState(null);
  const callTimerRef = useRef(null);

  const activeStep = useMemo(() => {
    if (messageSent) return 'sent';
    if (callState === 'calling') return 'calling';
    if (callState === 'answered') return 'answered';
    if (callState === 'missed') return 'missed';
    return 'idle';
  }, [callState, messageSent]);

  useEffect(() => {
    return () => {
      clearTimeout(callTimerRef.current);
      window.speechSynthesis?.cancel();
    };
  }, []);

  const finishWithMessage = () => {
    setIsSpeaking(false);
    setMessageSent(true);
    setCallState('sent');
  };

  const speakReport = ({ sendAfterSpeech = true } = {}) => {
    const text = buildSpokenReport();

    if (!('speechSynthesis' in window)) {
      setIsSpeaking(true);
      window.setTimeout(() => {
        if (sendAfterSpeech) finishWithMessage();
        else setIsSpeaking(false);
      }, 4200);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ar-MA';
    utterance.rate = 0.9;
    utterance.pitch = 1;

    const voices = window.speechSynthesis.getVoices();
    const arabicVoice = voices.find((voice) => voice.lang?.toLowerCase().startsWith('ar'));
    if (arabicVoice) utterance.voice = arabicVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      if (sendAfterSpeech) finishWithMessage();
      else setIsSpeaking(false);
    };
    utterance.onerror = () => {
      if (sendAfterSpeech) finishWithMessage();
      else setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const startSmartCall = () => {
    clearTimeout(callTimerRef.current);
    window.speechSynthesis?.cancel();
    setCallState('calling');
    setFarmerAnswered(null);
    setMessageSent(false);
    setDemoChannel(null);
    setIsSpeaking(false);

    callTimerRef.current = window.setTimeout(() => {
      const answered = Math.random() >= 0.5;
      setFarmerAnswered(answered);
      setCallState(answered ? 'answered' : 'missed');
      window.setTimeout(() => speakReport(), 500);
    }, CALL_DURATION_MS);
  };

  const sendDemoChannel = (channel) => {
    setDemoChannel(channel);
    setMessageSent(true);
  };

  const statusTitle = () => {
    if (callState === 'calling') return '📞 جاري الاتصال بالفلاح...';
    if (farmerAnswered === true && !messageSent) return 'الفلاح جاوب';
    if (farmerAnswered === false && !messageSent) return 'الفلاح ماجاوبش';
    if (messageSent) return '📩 تم إرسال التقرير للفلاح';
    return 'Smart Farmer Call Simulation';
  };

  return (
    <div className="relative -mx-4 -my-6 min-h-[calc(100vh-4rem)] overflow-hidden bg-[radial-gradient(circle_at_top_left,#dcfce7,transparent_34%),linear-gradient(135deg,#f7fee7_0%,#ecfdf5_45%,#f8fafc_100%)] px-4 py-6">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[2rem] border border-emerald-200 bg-white/80 p-5 shadow-xl shadow-emerald-900/5 backdrop-blur md:p-7">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase text-emerald-700">AgriCopilot Demo</p>
              <h1 className="mt-1 text-2xl font-black text-slate-900 md:text-3xl">
                Smart Farmer Call
              </h1>
            </div>
            <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">
              FREE API
            </div>
          </div>

          <div className="relative mx-auto max-w-[21rem] rounded-[2.5rem] border-[10px] border-slate-900 bg-slate-950 p-3 shadow-2xl">
            <div className="absolute left-1/2 top-2 h-1.5 w-20 -translate-x-1/2 rounded-full bg-slate-700" />
            <div className="min-h-[36rem] overflow-hidden rounded-[1.8rem] bg-gradient-to-b from-emerald-950 via-emerald-900 to-slate-950 p-5 text-white">
              <div className="flex items-center justify-between text-xs text-emerald-100">
                <span>AgriCopilot</span>
                <span>4G • 92%</span>
              </div>

              <div className="mt-10 text-center">
                <div className={`mx-auto flex h-28 w-28 items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-400/15 text-5xl shadow-lg shadow-emerald-400/20 ${callState === 'calling' ? 'ringing-phone' : ''}`}>
                  📞
                </div>
                <p className="mt-6 text-sm text-emerald-100">الفلاح أحمد • حقول الطماطم</p>
                <h2 className="mt-2 min-h-[4rem] text-2xl font-black leading-relaxed">{statusTitle()}</h2>
                {isSpeaking && (
                  <div className="mt-4 flex items-end justify-center gap-1" aria-label="voice playing">
                    <span className="voice-bar h-5" />
                    <span className="voice-bar h-8 animation-delay-100" />
                    <span className="voice-bar h-4 animation-delay-200" />
                    <span className="voice-bar h-7 animation-delay-300" />
                    <span className="voice-bar h-5 animation-delay-400" />
                  </div>
                )}
                {callState === 'missed' && !messageSent && (
                  <p className="mt-5 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-emerald-100">
                    🎤 جاري إرسال رسالة صوتية ذكية...
                  </p>
                )}
              </div>

              <div className="mt-10 space-y-3">
                {Object.entries(timelineLabels).map(([step, label]) => (
                  <div key={step} className={`flex items-center gap-3 rounded-2xl px-3 py-2 text-sm ${activeStep === step ? 'bg-emerald-400/20 text-white' : 'text-emerald-100/70'}`}>
                    <span className={`h-2.5 w-2.5 rounded-full ${activeStep === step ? 'bg-lime-300 shadow-[0_0_18px_#bef264]' : 'bg-emerald-700'}`} />
                    <span>{label}</span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={startSmartCall}
                disabled={callState === 'calling' || isSpeaking}
                className="mt-8 w-full rounded-2xl bg-lime-300 px-5 py-4 text-base font-black text-emerald-950 shadow-lg shadow-lime-300/20 transition hover:bg-lime-200 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
              >
                📞 الاتصال بالفلاح
              </button>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-[2rem] border border-emerald-200 bg-white/85 p-5 shadow-xl shadow-emerald-900/5 backdrop-blur md:p-7" dir="rtl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-emerald-700">التقرير الذكي</p>
                <h2 className="mt-1 text-2xl font-black text-slate-900">المتابعة كتوصّل ديما</h2>
              </div>
              <span className="w-fit rounded-full bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-800">
                SpeechSynthesis API
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3" dir="rtl">
              <div className="rounded-2xl bg-emerald-50 p-4">
                <p className="text-2xl font-black text-emerald-800">1</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">مكالمة وهمية واقعية</p>
              </div>
              <div className="rounded-2xl bg-lime-50 p-4">
                <p className="text-2xl font-black text-lime-700">2</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">صوت ذكي كيقرا النصيحة</p>
              </div>
              <div className="rounded-2xl bg-teal-50 p-4">
                <p className="text-2xl font-black text-teal-700">3</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">رسالة مكتوبة كتتبع المكالمة</p>
              </div>
            </div>
          </div>

          <div className={`rounded-[2rem] border p-5 shadow-xl shadow-emerald-900/5 transition md:p-7 ${messageSent ? 'border-emerald-300 bg-emerald-50/90' : 'border-slate-200 bg-white/80'}`}>
            {messageSent ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" dir="rtl">
                  <h3 className="text-xl font-black text-emerald-900">📩 تم إرسال التقرير للفلاح</h3>
                  <span className="w-fit rounded-full bg-white px-3 py-2 text-xs font-bold text-emerald-800">
                    Demo فقط - مجاني
                  </span>
                </div>
                <MessagePreview />
                <div className="grid gap-3 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => speakReport({ sendAfterSpeech: false })}
                    className="rounded-2xl bg-emerald-700 px-4 py-3 font-bold text-white transition hover:bg-emerald-800"
                  >
                    🔊 إعادة الاستماع للنصيحة
                  </button>
                  <button
                    type="button"
                    onClick={() => sendDemoChannel('email')}
                    className="rounded-2xl border border-emerald-300 bg-white px-4 py-3 font-bold text-emerald-900 transition hover:bg-emerald-50"
                  >
                    📧 إرسال عبر الإيميل
                  </button>
                  <button
                    type="button"
                    onClick={() => sendDemoChannel('sms')}
                    className="rounded-2xl border border-emerald-300 bg-white px-4 py-3 font-bold text-emerald-900 transition hover:bg-emerald-50"
                  >
                    📱 إرسال كرسالة
                  </button>
                </div>
                {demoChannel && (
                  <p className="rounded-2xl bg-white px-4 py-3 text-right text-sm font-semibold text-emerald-800" dir="rtl">
                    {demoChannel === 'email' ? 'تمت محاكاة الإرسال عبر الإيميل بنجاح.' : 'تمت محاكاة الإرسال كرسالة بنجاح.'}
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-emerald-300 bg-white/70 p-5 text-center" dir="rtl">
                <p className="text-lg font-black text-slate-800">معاينة الرسالة غادي تبان هنا</p>
                <p className="mt-2 text-sm text-slate-600">
                  سواء جاوب الفلاح ولا ماجاوبش، النظام كيرسل التقرير المكتوب من بعد الصوت.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
