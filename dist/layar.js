"use strict";
(() => {
    const session = Auth.guard();
    if (!session)
        return;
    UI.mountUserBox(session, UI.$("#userBox"));
    const grid = UI.$("#screenGrid");
    const banner = UI.$("#screenBanner");
    const clockEl = UI.$("#screenClock");
    const fsBtn = UI.$("#fullscreenBtn");
    const soundBtn = UI.$("#soundBtn");
    let lastSig = "";
    let soundOn = false;
    let audioCtx = null;
    let lastSpokenAt = Store.read(Store.KEYS.lastCall, null)?.at ?? 0;
    function render() {
        const types = Queue.types().filter((t) => t.active);
        const sig = JSON.stringify([types, Queue.tickets()]);
        if (sig === lastSig)
            return;
        lastSig = sig;
        if (!types.length) {
            grid.innerHTML = `<p class="screen-empty">Belum ada jenis antrian aktif. Minta admin menambahkannya di Dashboard.</p>`;
            return;
        }
        grid.innerHTML = types.map((type) => {
            const cur = Queue.current(type.id);
            const waiting = Queue.counts(type.id).waiting;
            return `<section class="screen-card${cur ? " is-calling" : ""}">
        ${cur ? `<img src="assets/seno-senang.png" alt="" aria-hidden="true" class="card-seno">` : ""}
        <h2 class="screen-type">${UI.esc(type.name)} <span>(${UI.esc(type.code)})</span></h2>
        <p class="screen-number${cur ? "" : " is-empty"}">${cur ? UI.esc(cur.label) : "—"}</p>
        <p class="screen-meta">${cur ? UI.priorityChip(cur.priority) : "&nbsp;"}</p>
        <p class="screen-waiting"><strong>${waiting}</strong> menunggu</p>
      </section>`;
        }).join("");
    }
    function renderBanner() {
        const host = banner.querySelector(".banner-content");
        if (!host)
            return;
        const e = Store.read(Store.KEYS.lastCall, null);
        host.innerHTML = e
            ? `<span class="label">Panggilan terakhir</span><strong>${UI.esc(e.label)}</strong>
         <span>${UI.esc(e.typeName)}</span><span class="at">${UI.clock(e.at)}</span>`
            : `<span class="label">Panggilan terakhir</span><span>Belum ada</span>`;
    }
    function toggleFullscreen() {
        if (document.fullscreenElement) {
            void document.exitFullscreen();
            return;
        }
        document.documentElement.requestFullscreen().catch(() => UI.toast("Layar penuh ditolak browser.", "error"));
    }
    fsBtn.addEventListener("click", toggleFullscreen);
    document.addEventListener("fullscreenchange", () => {
        fsBtn.textContent = document.fullscreenElement ? "⛶ Keluar Layar Penuh" : "⛶ Layar Penuh";
    });
    function chime() {
        try {
            const ctx = audioCtx ?? new AudioContext();
            audioCtx = ctx;
            const now = ctx.currentTime;
            const notes = [[880, 0], [1174.66, 0.18]];
            for (const [freq, at] of notes) {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = "sine";
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0.0001, now + at);
                gain.gain.exponentialRampToValueAtTime(0.3, now + at + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.35);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + at);
                osc.stop(now + at + 0.4);
            }
        }
        catch {
        }
    }
    function speak(event) {
        if (!("speechSynthesis" in window))
            return;
        const u = new SpeechSynthesisUtterance(`Nomor ${event.label.replace("-", " ")}, ${event.typeName}`);
        u.lang = "id-ID";
        u.rate = 0.9;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
    }
    soundBtn.addEventListener("click", () => {
        soundOn = !soundOn;
        soundBtn.textContent = soundOn ? "🔊 Suara Aktif" : "🔇 Suara Mati";
        soundBtn.classList.toggle("is-on", soundOn);
        if (soundOn) {
            chime();
            if ("speechSynthesis" in window) {
                const hello = new SpeechSynthesisUtterance("Suara panggilan antrian diaktifkan");
                hello.lang = "id-ID";
                window.speechSynthesis.speak(hello);
            }
        }
        else if ("speechSynthesis" in window) {
            window.speechSynthesis.cancel();
        }
    });
    function checkAnnouncement() {
        const event = Store.read(Store.KEYS.lastCall, null);
        if (!event || event.at === lastSpokenAt)
            return;
        lastSpokenAt = event.at;
        if (soundOn) {
            chime();
            speak(event);
        }
    }
    function tick() {
        render();
        renderBanner();
        checkAnnouncement();
    }
    window.setInterval(() => {
        clockEl.textContent = UI.clock();
    }, 1000);
    Store.watch(tick);
    tick();
    clockEl.textContent = UI.clock();
})();
