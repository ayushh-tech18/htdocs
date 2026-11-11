/* ============================================================================
   File : assets/js/video_engine.js (Part 3C — 60fps HTML5 Canvas Video Engine)
   Kaam : Yahi AdVideoEngine class hai. HTML5 <canvas> par 1 second me 60 frame
          banati hai (photo, Ken Burns zoom, shutter transition, animated headline
          aur glossy CTA button) taaki asli TV-commercial jaisa video chale,
          aur usse .webm file me download karti hai.
   ============================================================================ */

class AdVideoEngine {

    // Constructor: new AdVideoEngine('adCanvas') par chalta hai. Canvas aur uska
    // 2D drawing context (ctx) set karta hai aur photo preload karta hai.
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d'); // 2D graphics draw karne ka main brush

        this.project = null;            // Abhi jo ad project load hai
        this.scenes = [];               // Project ke 4 scenes ki array
        this.currentSceneIndex = 0;     // Abhi kaunsa scene chal raha hai (0 se 3)
        this.sceneElapsed = 0;          // Current scene ko chalte hue kitne seconds hue
        this.isPlaying = false;         // Video play ho raha hai ya pause hai
        this.lastTimestamp = 0;         // Pichhle frame ka exact time (smooth timing ke liye)
        this.rafId = null;              // requestAnimationFrame ki ID (pause karne ke kaam aati hai)

        // Image cache aur custom photo array: category ki photo aur 1-4 uploaded
        // photo RAM me ready rehti hain.
        this.imageCache = {};
        this.customImages = [];
        this.preloadMediaPack();

        this.onSceneChange = null;      // Scene badalne par studio_app.js ko batane wala callback
        this.onLoopComplete = null;     // 4 scenes poore hone par video recording rokne wala callback

        // Default video size 9:16 vertical (Reels / Shorts ke liye)
        this.setAspectRatio('9:16');
    }

    // Preload function: ad_media_pack.js ki photo load karta hai. Har category ki
    // .jpg ek Image() object me ready ho jaati hai.
    preloadMediaPack() {
        const pack = window.ADGENIUS_MEDIA || {};
        Object.keys(pack).forEach((key) => {
            const img = new Image();
            img.onload = () => {
                if (!this.isPlaying) this.renderFrame();
            };
            img.src = pack[key];
            this.imageCache[key] = img;
        });
    }

    // Multi-photo setter (1 se 4 photo, ek saath ya ek-ek). Saari uploaded photo
    // Image() object me load ho kar customImages array me chali jaati hain.
    setCustomImages(dataUriList, callback) {
        if (!Array.isArray(dataUriList) || dataUriList.length === 0) {
            this.customImages = [];
            this.renderFrame();
            if (callback) callback();
            return;
        }

        const loaded = new Array(dataUriList.length);
        let remaining = dataUriList.length;

        dataUriList.forEach((uri, i) => {
            const img = new Image();
            img.onload = () => {
                loaded[i] = img;
                remaining--;
                if (remaining === 0) {
                    this.customImages = loaded;
                    this.renderFrame();
                    if (callback) callback();
                }
            };
            img.onerror = () => {
                remaining--;
                if (remaining === 0) {
                    this.customImages = loaded.filter(Boolean);
                    this.renderFrame();
                    if (callback) callback();
                }
            };
            img.src = uri;
        });
    }

    // Single photo wala helper (purane code ke liye rakha hai).
    setCustomImage(dataUri, callback) {
        this.setCustomImages(dataUri ? [dataUri] : [], callback);
    }

    // Uploaded custom photo clear karta hai. 'Clear' dabane par category ki
    // default photo wapas dikhne lagti hai.
    clearCustomImages() {
        this.customImages = [];
        this.renderFrame();
    }

    // Aspect ratio aur retina HD sharpness (devicePixelRatio) set karta hai.
    // Canvas 9:16 (vertical), 16:9 (YouTube landscape) aur 1:1 (square) me badalta hai.
    setAspectRatio(ratio) {
        this.aspectRatio = ratio || '9:16';
        if (this.aspectRatio === '16:9') {
            this.width = 576;
            this.height = 324;
        } else if (this.aspectRatio === '1:1') {
            this.width = 440;
            this.height = 440;
        } else {
            this.width = 336;
            this.height = 596;
        }

        // DPR scaling se retina / HD screen par text aur photo ekdum sharp rehti hai
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.canvas.style.width = this.width + 'px';
        this.canvas.style.height = this.height + 'px';
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        this.renderFrame();
    }

    // Naya ad project engine me load karta hai: video Scene 1 (index 0) par
    // set hota hai aur autoPlay chalu ho jaata hai.
    loadProject(project, autoPlay = true) {
        this.pause();
        this.project = project;
        this.scenes = Array.isArray(project.scenes) ? project.scenes : [];
        this.currentSceneIndex = 0;
        this.sceneElapsed = 0;

        this.setAspectRatio(project.aspect_ratio || '9:16');
        if (this.onSceneChange) this.onSceneChange(0);

        if (autoPlay) this.play();
        else this.renderFrame();
    }

    // 60fps animation loop (requestAnimationFrame). Har 16 millisecond me time
    // aage badhta hai aur naya video frame draw hota hai.
    play() {
        if (!this.scenes.length || this.isPlaying) return;
        this.isPlaying = true;
        this.lastTimestamp = performance.now();

        const tick = (now) => {
            if (!this.isPlaying) return;
            // dt = pichle frame se ab tak kitne second beete
            const dt = Math.min(0.08, (now - this.lastTimestamp) / 1000);
            this.lastTimestamp = now;

            this.updateTimeline(dt);
            this.renderFrame();
            this.rafId = requestAnimationFrame(tick);
        };
        this.rafId = requestAnimationFrame(tick);
    }

    // Video pause function: cancelAnimationFrame se 60fps loop turant ruk jaata hai.
    pause() {
        this.isPlaying = false;
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    // Seedha kisi scene (0, 1, 2, 3) par jump karta hai. Scene pill button
    // dabane par wahi scene turant dikhta hai.
    jumpToScene(index) {
        if (index < 0 || index >= this.scenes.length) return;
        this.currentSceneIndex = index;
        this.sceneElapsed = 0;
        if (this.onSceneChange) this.onSceneChange(index);
        this.renderFrame();
    }

    // Scene timer: har scene 3.6 second chalta hai, time poora hone par agla
    // scene shuru ho jaata hai.
    updateTimeline(dt) {
        const curScene = this.scenes[this.currentSceneIndex];
        const dur = Number(curScene?.duration || 3.6);
        this.sceneElapsed += dt;

        if (this.sceneElapsed >= dur) {
            this.sceneElapsed = 0;
            this.currentSceneIndex = (this.currentSceneIndex + 1) % this.scenes.length;

            // Chaaron scene poore ho kar wapas 0 par aate hi loop-complete signal chalta hai
            if (this.currentSceneIndex === 0 && this.onLoopComplete) {
                this.onLoopComplete();
            }
            if (this.onSceneChange) {
                this.onSceneChange(this.currentSceneIndex);
            }
        }
    }

    // Cubic ease-out math function: animation shuru me tez aur end me smooth
    // (makhan jaisi) ho jaati hai.
    easeOutCubic(t) {
        const clamped = Math.max(0, Math.min(1, t));
        return 1 - Math.pow(1 - clamped, 3);
    }

    // Cover-crop + Ken Burns camera zoom/pan drawer: photo box me bina stretch
    // hue fit hoti hai aur dheere-dheere zoom/pan karti hai.
    drawImageCover(ctx, img, x, y, w, h, zoom = 1.08, panX = 0, panY = 0) {
        // Photo load hote waqt saaf dark gradient dikhta hai
        if (!img || !img.complete || !img.naturalWidth) {
            const fallback = ctx.createLinearGradient(x, y, x + w, y + h);
            fallback.addColorStop(0, '#141824');
            fallback.addColorStop(1, '#1e293b');
            ctx.fillStyle = fallback;
            ctx.fillRect(x, y, w, h);
            return;
        }

        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip(); // Photo ko box ke bahar nikalne se rokna

        const imgRatio = img.naturalWidth / img.naturalHeight;
        const boxRatio = w / h;
        let drawW, drawH;

        if (imgRatio > boxRatio) {
            drawH = h * zoom;
            drawW = drawH * imgRatio;
        } else {
            drawW = w * zoom;
            drawH = drawW / imgRatio;
        }

        const offsetX = x + (w - drawW) / 2 + panX * w;
        const offsetY = y + (h - drawH) / 2 + panY * h;

        ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
        ctx.restore();
    }

    // Chal rahe scene (1 se 4) ke liye sahi photo chunta hai. 1-4 custom photo
    // upload hui ho to har scene me alag photo aati hai (idx % customImages.length),
    // warna category ki photo dikhti hai.
    getSceneImage(sc, idx) {
        if (this.project?.custom_image && this.customImages.length > 0) {
            return this.customImages[idx % this.customImages.length];
        }
        const key = sc.image_key || 'food_1';
        if (this.imageCache[key]) return this.imageCache[key];
        return this.imageCache['food_1'] || null;
    }

    // ========================================================================
    // MAIN FRAME COMPOSITOR (har 1/60 second me poora video frame paint karta hai)
    // ========================================================================
    renderFrame() {
        const ctx = this.ctx;
        const W = this.width;
        const H = this.height;
        const isLand = W > H;

        // Purana frame clear karta hai taaki naya frame ban sake
        ctx.clearRect(0, 0, W, H);
        if (!this.scenes.length) return;

        const idx = this.currentSceneIndex;
        const sc = this.scenes[idx] || this.scenes[0];
        const dur = Number(sc.duration || 3.6);
        const progress = Math.min(1, this.sceneElapsed / dur); // 0.0 se 1.0 tak progress
        const accent = sc.accent || '#f97316';
        const img = this.getSceneImage(sc, idx);
        const brandName = (this.project?.product_name || 'Brand Studio').toUpperCase();

        // Chaar alag-alag commercial scene design. Scene 1, 2, 3 aur 4 asli
        // agency ad jaise chaar alag layout me dikhte hain.
        const layoutType = idx % 4;

        if (layoutType === 0) {
            this.renderHeroOpenerScene(ctx, W, H, isLand, sc, img, progress, accent);
        } else if (layoutType === 1) {
            this.renderSplitShowcaseScene(ctx, W, H, isLand, sc, img, progress, accent);
        } else if (layoutType === 2) {
            this.renderMacroEditorialScene(ctx, W, H, isLand, sc, img, progress, accent);
        } else {
            this.renderOfferEndSlateScene(ctx, W, H, isLand, sc, img, progress, accent, brandName);
        }

        // Scene badalne ke pehle 0.36s me motion wipe dikhta hai
        this.renderSceneTransition(ctx, W, H, idx, this.sceneElapsed, accent);

        // Instagram Stories/Reels jaise 4 progress bar aur upar brand name draw karta hai
        this.renderTopChrome(ctx, W, H, brandName, sc.kicker || sc.tag || 'SPONSORED', progress, accent);
    }

    // SCENE 1 DESIGN — full-screen photo zoom aur niche bold masked headline.
    // Yeh hero opening shot hai jo pehle hi second me dhyan khinch leta hai.
    renderHeroOpenerScene(ctx, W, H, isLand, sc, img, progress, accent) {
        const zoom = 1.24 - 0.17 * this.easeOutCubic(progress);
        const panX = -0.03 + 0.06 * progress;
        this.drawImageCover(ctx, img, 0, 0, W, H, zoom, panX, 0);

        // Top-left corner me halka warm cinema glow
        const leak = ctx.createRadialGradient(W * 0.15, H * 0.12, 10, W * 0.15, H * 0.12, W * 0.75);
        leak.addColorStop(0, accent + '36');
        leak.addColorStop(1, 'transparent');
        ctx.fillStyle = leak;
        ctx.fillRect(0, 0, W, H);

        // Niche gehra dark gradient taaki white text padhne me aaye
        const scrim = ctx.createLinearGradient(0, H * 0.32, 0, H);
        scrim.addColorStop(0, 'rgba(6, 8, 14, 0)');
        scrim.addColorStop(0.52, 'rgba(6, 8, 14, 0.72)');
        scrim.addColorStop(1, 'rgba(6, 8, 14, 0.96)');
        ctx.fillStyle = scrim;
        ctx.fillRect(0, 0, W, H);

        // Camera viewfinder ke corner marks draw karta hai
        this.drawViewfinderTicks(ctx, W, H);

        // Animated colored line, tag, headline aur subline draw karta hai
        const enter = this.easeOutCubic(this.sceneElapsed / 0.55);
        const baseX = 22;
        const baseY = isLand ? H - 108 : H - 178;

        ctx.fillStyle = accent;
        ctx.fillRect(baseX, baseY, 44 * enter, 3.5);

        ctx.fillStyle = accent;
        ctx.font = '700 10.5px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText((sc.tag || 'NEW LAUNCH').toUpperCase(), baseX, baseY + 19);

        const hSize = isLand ? 23 : 27;
        const nextY = this.drawMaskedHeadline(
            ctx,
            sc.headline || '',
            baseX,
            baseY + 48,
            W - 44,
            hSize,
            enter,
            'left'
        );

        ctx.save();
        ctx.globalAlpha = enter;
        ctx.fillStyle = 'rgba(226, 232, 240, 0.9)';
        ctx.font = '500 13px Inter, sans-serif';
        this.drawWrappedText(ctx, sc.subtext || '', baseX, nextY + 6, W - 46, 18, 'left');
        ctx.restore();
    }

    // SCENE 2 DESIGN — frame me photo card aur do slide hote feature bar.
    // Product ya college ki do main highlights (specs) slide ho kar aati hain.
    renderSplitShowcaseScene(ctx, W, H, isLand, sc, img, progress, accent) {
        // Dark ambient background draw karta hai
        this.drawImageCover(ctx, img, 0, 0, W, H, 1.42, 0, 0);
        ctx.fillStyle = 'rgba(7, 10, 17, 0.84)';
        ctx.fillRect(0, 0, W, H);

        // Halki vertical studio grid lines draw karta hai
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        for (let gx = 40; gx < W; gx += 48) {
            ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
        }

        // Rounded corner wala floating cinema photo card draw karta hai
        const enter = this.easeOutCubic(this.sceneElapsed / 0.55);
        const pad = 20;
        const frameY = isLand ? 50 : 58;
        const frameH = isLand ? H * 0.46 : H * 0.47;

        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
        ctx.shadowBlur = 26;
        this.roundClipRect(ctx, pad, frameY, W - pad * 2, frameH, 14);
        this.drawImageCover(ctx, img, pad, frameY, W - pad * 2, frameH, 1.06 + 0.1 * progress, 0.03 - 0.06 * progress, 0);
        ctx.restore();

        // Photo card ke aas-paas halka border lagata hai
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1.2;
        this.strokeRoundRect(ctx, pad, frameY, W - pad * 2, frameH, 14);

        // Photo card ke corner par chhota badge pill lagata hai
        ctx.fillStyle = accent;
        const pillText = (sc.badge || sc.tag || 'SIGNATURE QUALITY').toUpperCase();
        ctx.font = '800 9.5px Inter, sans-serif';
        const pillW = ctx.measureText(pillText).width + 20;
        this.fillRoundRect(ctx, pad + 12, frameY + frameH - 32, pillW, 22, 6);
        ctx.fillStyle = '#090b10';
        ctx.textAlign = 'left';
        ctx.fillText(pillText, pad + 22, frameY + frameH - 17.5);

        // Photo frame ke niche Scene 2 ka headline likhta hai
        const textTop = frameY + frameH + (isLand ? 26 : 34);
        const nextY = this.drawMaskedHeadline(
            ctx,
            sc.headline || '',
            pad,
            textTop,
            W - pad * 2,
            isLand ? 19 : 22,
            enter,
            'left'
        );

        // Do feature bar jo left se slide ho kar aate hain
        const specs = Array.isArray(sc.specs) && sc.specs.length >= 2
            ? sc.specs
            : [sc.subtext || 'Crafted with premium standards', 'Trusted by thousands daily'];

        specs.slice(0, isLand ? 1 : 2).forEach((line, i) => {
            const specEnter = this.easeOutCubic((this.sceneElapsed - 0.16 * (i + 1)) / 0.48);
            if (specEnter <= 0) return;

            const sy = nextY + 6 + i * 42;
            const slideX = (1 - specEnter) * -28;

            ctx.save();
            ctx.globalAlpha = specEnter;
            ctx.translate(slideX, 0);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
            this.fillRoundRect(ctx, pad, sy, W - pad * 2, 34, 7);

            ctx.fillStyle = accent;
            this.fillRoundRect(ctx, pad, sy, 4, 34, 2);

            ctx.fillStyle = '#f1f5f9';
            ctx.font = '600 12px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(String(line).slice(0, 40), pad + 14, sy + 21.5);
            ctx.restore();
        });
    }

    // SCENE 3 DESIGN — close-up camera pan, bada watermark aur frosted info card.
    // Yeh teesra shot brand experience aur quality ka feel banata hai.
    renderMacroEditorialScene(ctx, W, H, isLand, sc, img, progress, accent) {
        const panX = 0.05 - 0.10 * progress;
        this.drawImageCover(ctx, img, 0, 0, W, H, 1.18, panX, -0.02);

        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, 'rgba(7, 9, 15, 0.45)');
        grad.addColorStop(0.45, 'rgba(7, 9, 15, 0.12)');
        grad.addColorStop(1, 'rgba(7, 9, 15, 0.92)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        // Background me halka chalta hua bada watermark text (jaise FRESH / FUTURE)
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.font = '900 54px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText((sc.watermark || 'PREMIUM').toUpperCase(), W / 2 + (0.5 - progress) * 36, H * 0.22);
        ctx.restore();

        // Niche dark card jo Scene 3 ka headline aur subline rakhta hai
        const enter = this.easeOutCubic(this.sceneElapsed / 0.5);
        const cardH = isLand ? 124 : 176;
        const cardY = H - cardH - 18;

        ctx.save();
        ctx.globalAlpha = enter;
        ctx.fillStyle = 'rgba(10, 14, 23, 0.84)';
        this.fillRoundRect(ctx, 18, cardY, W - 36, cardH, 16);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        this.strokeRoundRect(ctx, 18, cardY, W - 36, cardH, 16);

        ctx.fillStyle = accent;
        ctx.font = '800 10px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText((sc.tag || 'WHY CHOOSE US').toUpperCase(), 34, cardY + 26);

        const nextY = this.drawMaskedHeadline(
            ctx,
            sc.headline || '',
            34,
            cardY + 54,
            W - 68,
            isLand ? 19 : 22,
            enter,
            'left'
        );

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '500 12.5px Inter, sans-serif';
        this.drawWrappedText(ctx, sc.subtext || '', 34, nextY + 6, W - 68, 17.5, 'left');
        ctx.restore();
    }

    // SCENE 4 DESIGN — last offer end-slate, promo ribbon aur chamakta CTA button.
    // Ad ke end me main offer aur 'ORDER NOW / APPLY NOW' button dikhta hai.
    renderOfferEndSlateScene(ctx, W, H, isLand, sc, img, progress, accent, brandName) {
        const photoH = isLand ? H * 0.52 : H * 0.56;
        this.drawImageCover(ctx, img, 0, 0, W, photoH + 24, 1.14 - 0.08 * progress, 0, 0);

        // Upar ki photo ko niche ke dark card me smoothly mix karta hai
        const fade = ctx.createLinearGradient(0, photoH - 60, 0, photoH + 18);
        fade.addColorStop(0, 'rgba(9, 11, 16, 0)');
        fade.addColorStop(1, '#090b10');
        ctx.fillStyle = fade;
        ctx.fillRect(0, photoH - 60, W, 82);

        ctx.fillStyle = '#090b10';
        ctx.fillRect(0, photoH + 16, W, H - photoH);

        const enter = this.easeOutCubic(this.sceneElapsed / 0.48);

        // Photo ke kinare par rounded promo offer ribbon draw karta hai
        const offerTag = (sc.badge || 'SPECIAL LAUNCH OFFER').toUpperCase();
        ctx.font = '800 10.5px Inter, sans-serif';
        const tagW = Math.min(W - 48, ctx.measureText(offerTag).width + 28);
        const tagY = photoH - 12;

        ctx.save();
        ctx.translate(W / 2, tagY + 13);
        ctx.scale(0.85 + 0.15 * enter, 0.85 + 0.15 * enter);
        ctx.fillStyle = accent;
        this.fillRoundRect(ctx, -tagW / 2, -13, tagW, 26, 99);
        ctx.fillStyle = '#090b10';
        ctx.textAlign = 'center';
        ctx.fillText(offerTag, 0, 4);
        ctx.restore();

        // Center me brand name aur main offer likhta hai
        const headY = photoH + (isLand ? 42 : 52);
        const nextY = this.drawMaskedHeadline(
            ctx,
            sc.headline || '',
            W / 2,
            headY,
            W - 44,
            isLand ? 20 : 24,
            enter,
            'center'
        );

        ctx.fillStyle = '#94a3b8';
        ctx.font = '500 12.5px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText((sc.subtext || '').slice(0, 48), W / 2, nextY + 6);

        // Chalti sheen ke saath white call-to-action (CTA) button draw karta hai
        const btnW = W - 52;
        const btnH = isLand ? 38 : 44;
        const btnX = 26;
        const btnY = H - btnH - (isLand ? 14 : 24);

        ctx.save();
        this.roundClipRect(ctx, btnX, btnY, btnW, btnH, 10);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(btnX, btnY, btnW, btnH);

        // Glossy light sweep jo button par lagatar chalti rehti hai
        const sheenX = btnX - 80 + ((this.sceneElapsed * 210) % (btnW + 180));
        const sheenGrad = ctx.createLinearGradient(sheenX, btnY, sheenX + 60, btnY + btnH);
        sheenGrad.addColorStop(0, 'rgba(255,255,255,0)');
        sheenGrad.addColorStop(0.5, accent + '45');
        sheenGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = sheenGrad;
        ctx.fillRect(btnX, btnY, btnW, btnH);

        ctx.fillStyle = '#090b10';
        ctx.font = '800 12.5px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText((sc.cta_text || `EXPLORE ${brandName}`).slice(0, 30), W / 2, btnY + btnH / 2 + 4.5);
        ctx.restore();
    }

    // Scene cut transition: ek scene se doosre scene par jaate waqt diagonal wipe
    // ya split curtain dikhta hai.
    renderSceneTransition(ctx, W, H, sceneIdx, elapsed, accent) {
        const tDur = 0.36;
        if (elapsed >= tDur) return;
        const p = this.easeOutCubic(elapsed / tDur);

        ctx.save();
        if (sceneIdx === 1) {
            // Tirchi colored strip (razor shutter wipe)
            const xPos = (1 - p) * (W + 120) - 60;
            ctx.fillStyle = accent;
            ctx.beginPath();
            ctx.moveTo(xPos, 0);
            ctx.lineTo(xPos + 34, 0);
            ctx.lineTo(xPos - 26, H);
            ctx.lineTo(xPos - 60, H);
            ctx.closePath();
            ctx.fill();
        } else if (sceneIdx === 2) {
            // Upar aur niche se khulta curtain (split curtain wipe)
            const barH = (1 - p) * (H / 2);
            ctx.fillStyle = '#090b10';
            ctx.fillRect(0, 0, W, barH);
            ctx.fillRect(0, H - barH, W, barH);
        } else {
            // Camera flash jaisa light effect
            ctx.fillStyle = `rgba(255, 255, 255, ${(1 - p) * 0.28})`;
            ctx.fillRect(0, 0, W, H);
        }
        ctx.restore();
    }

    // Upar Reels/Stories progress bar aur brand header: video ke sabse upar
    // 4 scene ki progress line aur brand name dikhta hai.
    renderTopChrome(ctx, W, H, brandName, tagLabel, sceneProgress, accent) {
        const topShade = ctx.createLinearGradient(0, 0, 0, 56);
        topShade.addColorStop(0, 'rgba(0,0,0,0.62)');
        topShade.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = topShade;
        ctx.fillRect(0, 0, W, 56);

        // 4 chhoti scene progress lines draw karta hai
        const gap = 5;
        const mx = 16;
        const count = this.scenes.length;
        const bw = (W - mx * 2 - gap * (count - 1)) / count;

        for (let i = 0; i < count; i++) {
            const bx = mx + i * (bw + gap);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.26)';
            this.fillRoundRect(ctx, bx, 12, bw, 3, 2);

            const ratio = i < this.currentSceneIndex ? 1 : (i === this.currentSceneIndex ? sceneProgress : 0);
            if (ratio > 0) {
                ctx.fillStyle = '#ffffff';
                this.fillRoundRect(ctx, bx, 12, bw * ratio, 3, 2);
            }
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = '700 10.5px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(brandName.slice(0, 22), 16, 33);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
        ctx.font = '600 9.5px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(tagLabel.toUpperCase().slice(0, 18), W - 16, 33);
    }

    // Camera viewfinder ke corner marks.
    drawViewfinderTicks(ctx, W, H) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
        ctx.lineWidth = 1.2;
        const m = 16, len = 10, top = 46;
        ctx.beginPath();
        ctx.moveTo(m, top + len); ctx.lineTo(m, top); ctx.lineTo(m + len, top);
        ctx.moveTo(W - m - len, top); ctx.lineTo(W - m, top); ctx.lineTo(W - m, top + len);
        ctx.stroke();
    }

    // Masked line-by-line headline animation: lamba headline line me toot kar
    // niche se upar slide ho kar aata hai.
    drawMaskedHeadline(ctx, text, x, startY, maxWidth, fontSize, enterProgress, align = 'left') {
        ctx.font = `800 ${fontSize}px Inter, sans-serif`;
        ctx.textAlign = align;
        const lineHeight = fontSize * 1.18;

        const words = String(text).split(' ');
        const lines = [];
        let cur = '';
        words.forEach((w) => {
            const test = cur + w + ' ';
            if (ctx.measureText(test).width > maxWidth && cur !== '') {
                lines.push(cur.trim());
                cur = w + ' ';
            } else {
                cur = test;
            }
        });
        if (cur.trim()) lines.push(cur.trim());

        let y = startY;
        lines.slice(0, 3).forEach((line, idx) => {
            const lineProg = this.easeOutCubic((enterProgress * 1.25) - idx * 0.14);
            const rise = (1 - lineProg) * (fontSize * 0.95);

            ctx.save();
            ctx.beginPath();
            ctx.rect(0, y - fontSize, this.width, fontSize * 1.38);
            ctx.clip();

            ctx.fillStyle = '#ffffff';
            ctx.fillText(line, x, y + rise);
            ctx.restore();

            y += lineHeight;
        });
        return y;
    }

    // Automatic word-wrap helper: subline text canvas ki width me next line par
    // chala jaata hai.
    drawWrappedText(ctx, text, x, startY, maxWidth, lineHeight, align = 'left') {
        ctx.textAlign = align;
        const words = String(text).split(' ');
        let line = '';
        let y = startY;

        for (let n = 0; n < words.length; n++) {
            const test = line + words[n] + ' ';
            if (ctx.measureText(test).width > maxWidth && n > 0) {
                ctx.fillText(line.trim(), x, y);
                line = words[n] + ' ';
                y += lineHeight;
            } else {
                line = test;
            }
        }
        if (line.trim()) {
            ctx.fillText(line.trim(), x, y);
            y += lineHeight;
        }
        return y;
    }

    // Teen chhote helper method jo rounded box draw aur clip karte hain
    fillRoundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h);
        ctx.fill();
    }

    strokeRoundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h);
        ctx.stroke();
    }

    roundClipRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h);
        ctx.clip();
    }

    // ========================================================================
    // VIDEO DOWNLOAD FUNCTION (HTML5 captureStream + MediaRecorder + Blob)
    // Canvas ke frame record kar ke asli .webm video file banata hai.
    // Scene 1 se Scene 4 tak poora ad record ho kar laptop me download ho jaata hai.
    // ========================================================================
    exportWebmVideo(onDone) {
        try {
            if (!this.canvas.captureStream || typeof MediaRecorder === 'undefined') {
                if (onDone) onDone(false);
                return;
            }
            // Recording shuru hone se pehle Scene 1 ke shuru par reset hota hai
            this.pause();
            this.currentSceneIndex = 0;
            this.sceneElapsed = 0;

            // Canvas se 30fps live video stream le kar MediaRecorder ko deta hai
            const stream = this.canvas.captureStream(30);
            const chunks = [];
            const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
            const recorder = new MediaRecorder(stream, { mimeType: mime });

            // Video ke chhote data chunk ikattha karta hai
            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) chunks.push(e.data);
            };

            // Recording band hote hi saare chunk Blob ban kar .webm file me download ho jaate hain
            recorder.onstop = () => {
                const url = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' }));
                const a = document.createElement('a');
                const safe = (this.project?.product_name || 'Commercial_Ad').replace(/[^a-z0-9]/gi, '_');
                a.href = url;
                a.download = `${safe}_Ad.webm`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
                if (onDone) onDone(true);
            };

            // Chaaron scene poore hote hi recording band kar deta hai
            this.onLoopComplete = () => {
                this.onLoopComplete = null;
                this.pause();
                if (recorder.state !== 'inactive') recorder.stop();
            };

            recorder.start();
            this.play();
        } catch (err) {
            if (onDone) onDone(false);
        }
    }
}