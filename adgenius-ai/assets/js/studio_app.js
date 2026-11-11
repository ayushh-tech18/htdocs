/* ============================================================================
   File : assets/js/studio_app.js (Part 3B — Main Studio UI aur API Controller)
   Kaam : Frontend ka main controller. 4 tab switch karta hai, 6 category button
          chalata hai, uploaded photo padhta hai, live headline/subline badalta
          hai, aur fetch() se PHP + MySQL me project save / list / delete karta hai.
   ============================================================================ */

// DOMContentLoaded listener: index.html poora load hone ke baad hi chalta hai.
document.addEventListener('DOMContentLoaded', () => {

    // HTML se <canvas id="adCanvas"> pakadta hai.
    // Canvas page par na ho to yahin ruk jaata hai taaki error na aaye.
    const canvasEl = document.getElementById('adCanvas');
    if (!canvasEl) return;

    // video_engine.js ki AdVideoEngine class ka naya object banata hai.
    // Yahi engine 60fps commercial chalata hai aur .webm file record karta hai.
    const engine = new AdVideoEngine('adCanvas');

    // App ki memory: kaun sa video khula hai, kaun sa scene chal raha hai,
    // aur kaun si category chuni hui hai.
    let currentProject = null;          // Abhi jo commercial project screen par chal raha hai
    let savedProjects = [];             // MySQL database se aaye hue saare saved ads ki list
    let selectedSceneIdx = 0;           // Abhi kaunsa scene (0 = Scene 1 ... 3 = Scene 4) select hai
    let selectedCategory = 'food';      // Default template category: food aur pizza
    let uploadedCustomPhotos = [];      // User ki upload ki gayi 1 se 4 custom photos ki Base64 array
    const customPhotosByProject = {};   // Har saved project ki custom photos yaad rakhne ka map

    // Is object me 6 ready-made commercial preset hain.
    // Category button dabate hi brand name aur offer turant bhar jaate hain.
    const presets = {
        food: {
            name: 'FlameCraft Pizza & Burger',
            desc: 'Wood-fired pepperoni pizza and a double smashed cheeseburger - Buy 1 Get 1 Free, 25 minute hot delivery.'
        },
        study: {
            name: 'Apex Institute of Technology',
            desc: 'B.Tech, BCA & Computer Science Admissions 2026 Open - Modern Labs, Mentors & Up to 50% Scholarship.'
        },
        tech: {
            name: 'AeroPods Pro Wireless',
            desc: '45-Hour Battery, Studio Active Noise Cancellation and a Matte Finish - Flat 35% Launch Off.'
        },
        fashion: {
            name: 'Velocity Air Sneakers',
            desc: 'Ultra-light streetwear silhouette with all-day comfort - Limited Season Drop Live Now.'
        },
        coffee: {
            name: 'RoastLab Cold Brew',
            desc: '100% Roasted Arabica Iced Coffee, Zero Added Sugar — Buy 2 Get 1 Free Across India.'
        },
        beauty: {
            name: 'Aura Botanical Glow Serum',
            desc: 'Pure Vitamin C & Hyaluronic Drops for 7-Day Glass Skin Radiance — Free Shipping Today.'
        }
    };

    // Turant preview dikhane wala offline fallback builder. XAMPP band ho
    // (file direct khuli ho) tab bhi 4-scene video bana deta hai.
    function buildLocalFallbackProject(name, desc, platform, ratio, lang, cat) {
        // Lamba description 78 character me kaat dete hain taaki video par padhne layak rahe
        const cleanDesc = desc.length > 78 ? desc.slice(0, 75) + '...' : desc;

        // Har category ki photo, accent color aur headline
        const map = {
            food: {
                img1: 'food_1', img2: 'food_2', accent: '#f97316',
                tag1: 'HOT & FRESH KITCHEN', h1: 'Craving Real Wood-Fired Flavor',
                h2: 'Melted Cheese & Crispy Golden Crunch',
                specs: ['100% Fresh Dough & Double Smashed Patty', '25-Minute Piping Hot Doorstep Delivery'],
                h3: 'Crafted Hot For Every Craving',
                cta: 'ORDER FRESH NOW', badge: 'BUY 1 GET 1 FREE', wm: 'FRESH'
            },
            study: {
                img1: 'study_1', img2: 'study_2', accent: '#38bdf8',
                tag1: 'ADMISSIONS OPEN 2026', h1: 'Shape Your Future In Technology',
                h2: 'Modern Campus & Practical Coding Labs',
                specs: ['Industry-Aligned Curriculum & Live Projects', 'Strong Placement Support With Top Recruiters'],
                h3: 'Learn From Mentors Who Build Leaders',
                cta: 'APPLY FOR 2026', badge: 'SCHOLARSHIP OPEN', wm: 'FUTURE'
            },
            tech: {
                img1: 'tech_1', img2: 'tech_1', accent: '#6366f1',
                tag1: 'NEXT-GEN AUDIO', h1: 'Engineered For Pure Studio Precision',
                h2: 'Flagship Performance Inside Out',
                specs: ['45-Hour Battery & Fast USB-C Charge', 'Active Noise Cancellation Architecture'],
                h3: 'Minimal Matte Finish For Daily Carry', cta: 'SHOP LAUNCH DROP', badge: 'NEW RELEASE', wm: 'PRO'
            },
            fashion: {
                img1: 'fashion_1', img2: 'fashion_1', accent: '#f43f5e',
                tag1: 'LIMITED STREETWEAR DROP', h1: 'Built To Stand Out Every Step',
                h2: 'Precision Cushioning & Clean Silhouette',
                specs: ['Ultra-Light Breathable Mesh Upper', 'All-Day Responsive Street Sole'],
                h3: 'Own Your Everyday Street Presence', cta: 'EXPLORE COLLECTION', badge: 'LIMITED EDITION', wm: 'STYLE'
            },
            coffee: {
                img1: 'coffee_1', img2: 'coffee_1', accent: '#f59e0b',
                tag1: 'FRESHLY ROASTED ARABICA', h1: 'Cold Crafted Smoothness In Every Sip',
                h2: '18-Hour Slow Steeped Rich Aroma',
                specs: ['100% Specialty Grade Arabica Beans', 'Zero Preservatives • Ready To Chill'],
                h3: 'Your Daily Creative Fuel Upgrade', cta: 'GRAB YOUR BREW', badge: 'CAFE SPECIAL', wm: 'ROAST'
            },
            beauty: {
                img1: 'beauty_1', img2: 'beauty_1', accent: '#10b981',
                tag1: 'BOTANICAL SKINCARE', h1: 'Visible Natural Radiance Every Morning',
                h2: 'Clean Clinical Actives For Healthy Skin',
                specs: ['Pure Vitamin C + Hyaluronic Complex', 'Lightweight Non-Sticky Daily Formula'],
                h3: 'Dermatologically Tested Clean Beauty', cta: 'DISCOVER GLOW', badge: 'PURE FORMULA', wm: 'GLOW'
            }
        };
        const t = map[cat] || map.food;

        // Poora project object return karta hai: 4 scene + social caption + hashtags
        return {
            id: Date.now(),
            product_name: name,
            product_desc: desc,
            category: cat,
            platform: platform,
            aspect_ratio: ratio,
            ad_language: 'English',
            custom_image: uploadedCustomPhotos.length > 0,
            scenes: [
                { scene_no: 1, tag: t.tag1, headline: t.h1, subtext: cleanDesc, duration: 3.6, image_key: t.img1, accent: t.accent, badge: t.badge },
                { scene_no: 2, tag: 'KEY HIGHLIGHTS', headline: t.h2, subtext: name, specs: t.specs, duration: 3.6, image_key: t.img2, accent: t.accent, badge: 'TOP RATED' },
                { scene_no: 3, tag: 'REAL EXPERIENCE', headline: t.h3, subtext: cleanDesc, watermark: t.wm, duration: 3.6, image_key: t.img1, accent: t.accent, badge: 'FEATURED' },
                { scene_no: 4, tag: 'SPECIAL OFFER', headline: name, subtext: cleanDesc, cta_text: t.cta, duration: 3.6, image_key: t.img2, accent: t.accent, badge: t.badge }
            ],
            caption_text: `${name} — ${desc} Order or apply today.`,
            hashtags: `#${name.replace(/[^a-zA-Z0-9]/g, '')} #CommercialAd #ReelsVideo #ShortVideoAd`,
            created_at: 'Saved Today'
        };
    }

    // ========================================================================
    // 1. NAVBAR KE 4 TAB SWITCH KARNA
    // openView(viewName) single-page tab switcher hai — pehle saare .view-pane
    // chhupata hai, phir chuni hui tab par .active lagata hai.
    // ========================================================================
    function openView(viewName) {
        document.querySelectorAll('.view-pane').forEach((pane) => pane.classList.remove('active'));
        document.querySelectorAll('.nav-link-btn').forEach((btn) => btn.classList.remove('active'));

        const targetPane = document.getElementById('pane-' + viewName);
        const targetTab = document.getElementById('tab-' + viewName);
        if (targetPane) targetPane.classList.add('active');
        if (targetTab) targetTab.classList.add('active');

        // 'Saved Campaigns' tab khulte hi MySQL se fresh list aati hai
        if (viewName === 'saved') {
            loadSavedAds();
        }
    }

    // Jin HTML elements par data-open-view hai, sab par click event lagta hai.
    // Navbar tab, logo ya button dabane par sahi view khul jaata hai.
    document.querySelectorAll('[data-open-view]').forEach((el) => {
        el.addEventListener('click', () => {
            openView(el.getAttribute('data-open-view'));
        });
    });

    // Toast helper: 2.5 second ke liye bottom right corner me chhota popup dikhata hai.
    function showToast(msg) {
        const toastEl = document.getElementById('appToast');
        if (!toastEl) return;
        toastEl.textContent = msg;
        toastEl.classList.add('show');
        setTimeout(() => toastEl.classList.remove('show'), 2500);
    }

    // Uploaded photo ke chhote thumbnail (Scene 1..4) dikhane ya chhupane wala helper.
    // Isse pata chalta hai kitni photo upload hui hain, aur Clear button bhi milta hai.
    function renderUploadedThumbnails() {
        const wrap = document.getElementById('uploadedThumbsWrap');
        const list = document.getElementById('uploadedThumbsList');
        const uploadNote = document.getElementById('uploadStatusText');
        if (!wrap || !list) return;

        if (uploadedCustomPhotos.length === 0) {
            wrap.style.display = 'none';
            list.innerHTML = '';
            if (uploadNote) uploadNote.textContent = 'Optional: Upload up to 4 product photos';
            return;
        }

        wrap.style.display = 'flex';
        list.innerHTML = '';
        if (uploadNote) {
            uploadNote.textContent = `${uploadedCustomPhotos.length} / 4 photos added (click again to add more)`;
        }

        uploadedCustomPhotos.forEach((uri, idx) => {
            const chip = document.createElement('div');
            chip.className = 'thumb-chip';
            chip.style.cursor = 'pointer';
            chip.title = `Click to preview Scene ${idx + 1}`;
            chip.innerHTML = `
                <img src="${uri}" alt="Scene ${idx + 1}">
                <span class="thumb-scene-tag">S${idx + 1}</span>
            `;
            chip.addEventListener('click', () => {
                selectedSceneIdx = idx;
                engine.jumpToScene(idx);
                populateQuickEdit(idx);
            });
            list.appendChild(chip);
        });
    }

    // ========================================================================
    // 2. COMMERCIAL TEMPLATE KE CATEGORY BUTTON
    // [data-cat] buttons par click listener. Form me sample text bharta hai aur
    // turant live canvas preview chalu kar deta hai.
    // ========================================================================
    document.querySelectorAll('[data-cat]').forEach((btn) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-cat]').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            selectedCategory = btn.dataset.cat;
            uploadedCustomPhotos = [];
            engine.clearCustomImages();
            renderUploadedThumbnails();

            const preset = presets[selectedCategory];
            if (preset) {
                document.getElementById('productName').value = preset.name;
                document.getElementById('productDesc').value = preset.desc;

                // Click ke turant baad us category ka commercial 60fps canvas par chalta hai
                const instantPreview = buildLocalFallbackProject(
                    preset.name,
                    preset.desc,
                    document.getElementById('platformSelect').value,
                    document.getElementById('aspectRatioSelect').value,
                                        selectedCategory
                );
                loadProjectIntoUI(instantPreview, true);
            }
        });
    });

    // ========================================================================
    // 3. MULTI-PHOTO UPLOAD (1 se 4 photo — HTML5 FileReader API)
    // User ek saath 3-4 photo chun sakta hai, ya ek-ek kar ke 4 tak jod sakta hai.
    // Photo 1 -> Scene 1, Photo 2 -> Scene 2, Photo 3 -> Scene 3, Photo 4 -> Scene 4.
    // ========================================================================
    const photoInput = document.getElementById('customPhotoInput');
    if (photoInput) {
        photoInput.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files || []);
            if (!files.length) return;

            // Har chuni hui file ko Promise + FileReader se Base64 data URI me padhta hai
            const readOneFile = (file) => new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (ev) => resolve(ev.target.result);
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(file);
            });

            const newlyRead = (await Promise.all(files.slice(0, 4).map(readOneFile))).filter(Boolean);
            if (!newlyRead.length) return;

            // 4 se kam photo hain to nayi photo jodta hai (maximum 4)
            if (uploadedCustomPhotos.length > 0 && uploadedCustomPhotos.length + newlyRead.length <= 4) {
                uploadedCustomPhotos = uploadedCustomPhotos.concat(newlyRead);
            } else if (newlyRead.length >= 4 || uploadedCustomPhotos.length >= 4) {
                uploadedCustomPhotos = newlyRead.slice(0, 4);
            } else {
                uploadedCustomPhotos = uploadedCustomPhotos.concat(newlyRead).slice(0, 4);
            }

            // Input value reset karta hai taaki agli baar phir photo chuni ja sake
            photoInput.value = '';
            renderUploadedThumbnails();

            engine.setCustomImages(uploadedCustomPhotos, () => {
                if (currentProject) {
                    currentProject.custom_image = true;
                    engine.renderFrame();
                }
            });
            showToast(`${uploadedCustomPhotos.length} custom photo(s) applied across 4 scenes`);
        });
    }

    // Clear button: uploaded photo hata kar default template photo par wapas le aata hai.
    const clearPhotosBtn = document.getElementById('clearPhotosBtn');
    if (clearPhotosBtn) {
        clearPhotosBtn.addEventListener('click', () => {
            uploadedCustomPhotos = [];
            engine.clearCustomImages();
            if (currentProject) {
                currentProject.custom_image = false;
                engine.renderFrame();
            }
            renderUploadedThumbnails();
            showToast('Custom photos cleared');
        });
    }

    // ========================================================================
    // 4. VIDEO PLAYER CONTROLS (play/pause, aspect ratio aur .webm export)
    // ========================================================================

    // Play / pause toggle button. Video chal raha ho to rokt deta hai,
    // paused ho to 60fps loop dobara chalu kar deta hai.
    const playPauseBtn = document.getElementById('playPauseBtn');
    playPauseBtn.addEventListener('click', () => {
        if (engine.isPlaying) {
            engine.pause();
            playPauseBtn.textContent = 'Play';
        } else {
            engine.play();
            playPauseBtn.textContent = 'Pause';
        }
    });

    // Aspect ratio dropdown (9:16, 16:9, 1:1). Dropdown badalte hi canvas ki
    // nayi width aur height set ho jaati hai.
    const ratioSelect = document.getElementById('aspectRatioSelect');
    ratioSelect.addEventListener('change', () => {
        engine.setAspectRatio(ratioSelect.value);
        if (currentProject) {
            currentProject.aspect_ratio = ratioSelect.value;
            document.getElementById('metaFormat').textContent = `${ratioSelect.value} • 4 Scenes`;
        }
    });

    // Video agle scene par jaate waqt chalne wala callback. Scene 1..4 ka
    // highlight button badalta hai aur us scene ka text edit box me aata hai.
    engine.onSceneChange = (idx) => {
        selectedSceneIdx = idx;
        document.querySelectorAll('.scene-pill').forEach((p, i) => p.classList.toggle('active', i === idx));
        populateQuickEdit(idx);
    };

    // Download (.webm) button: engine.exportWebmVideo() se poora 4-scene ad
    // video file ke roop me download ho jaata hai.
    const exportBtn = document.getElementById('exportVideoBtn');
    exportBtn.addEventListener('click', () => {
        if (!currentProject) return;
        exportBtn.disabled = true;
        exportBtn.textContent = 'Rendering Video...';
        engine.exportWebmVideo((ok) => {
            exportBtn.disabled = false;
            exportBtn.textContent = 'Download Video (.webm)';
            playPauseBtn.textContent = 'Play';
            if (ok) showToast('Commercial video downloaded (.webm)');
        });
    });

    // ========================================================================
    // 4B. JAVASCRIPT FORM VALIDATION (data PHP ko jaane se pehle chalta hai)
    // Assignment ki requirement. Brand name aur offer check karta hai, field ke
    // niche laal message dikhata hai, aur dono sahi hone tak submit rokt deta hai.
    // ========================================================================
    const nameInput = document.getElementById('productName');
    const descInput = document.getElementById('productDesc');

    function validateStudioForm() {
        let valid = true;

        // Rule 1: brand name kam se kam 3 character ka ho
        if (nameInput.value.trim().length < 3) {
            document.getElementById('productNameError').textContent = 'Brand name must be at least 3 characters.';
            nameInput.classList.add('input-error');
            valid = false;
        } else {
            document.getElementById('productNameError').textContent = '';
            nameInput.classList.remove('input-error');
        }

        // Rule 2: offer kam se kam 10 character ka ho
        if (descInput.value.trim().length < 10) {
            document.getElementById('productDescError').textContent = 'Offer must be at least 10 characters.';
            descInput.classList.add('input-error');
            valid = false;
        } else {
            document.getElementById('productDescError').textContent = '';
            descInput.classList.remove('input-error');
        }

        return valid;
    }

    // Live feedback: sahi value type karte hi error apne aap gayab ho jaata hai
    [nameInput, descInput].forEach((input) => {
        input.addEventListener('input', () => {
            if (input.value.trim().length >= (input === nameInput ? 3 : 10)) {
                input.classList.remove('input-error');
                document.getElementById(input.id + 'Error').textContent = '';
            }
        });
    });

    // ========================================================================
    // 4C. EDIT MODE (CRUD ka Update part)
    // Jo campaign edit ho raha hai uski id yaad rakhta hai, aur form ko
    // "create" aur "update" mode ke beech switch karta hai.
    // ========================================================================
    let editingProjectId = null;

    function startEdit(project) {
        editingProjectId = project.id;
        nameInput.value = project.product_name || '';
        descInput.value = project.product_desc || '';
        if (project.platform) document.getElementById('platformSelect').value = project.platform;
        if (project.aspect_ratio) ratioSelect.value = project.aspect_ratio;
        if (project.category && presets[project.category]) {
            selectedCategory = project.category;
            document.querySelectorAll('[data-cat]').forEach((b) => {
                b.classList.toggle('active', b.dataset.cat === project.category);
            });
        }

        document.getElementById('editModeBar').style.display = 'flex';
        document.getElementById('editModeText').textContent = 'Editing: ' + (project.product_name || 'campaign');
        document.getElementById('generateBtn').textContent = 'Update Campaign';
        openView('studio');
        showToast('Edit mode: change the details and press Update');
    }

    function stopEdit() {
        editingProjectId = null;
        document.getElementById('editModeBar').style.display = 'none';
        document.getElementById('generateBtn').textContent = 'Generate Video Ad';
    }

    document.getElementById('cancelEditBtn').addEventListener('click', () => {
        stopEdit();
        showToast('Edit cancelled');
    });

    // ========================================================================
    // 5. FORM SUBMIT -> PHP BACKEND + MYSQL SAVE (fetch API)
    // async/await se POST request jaati hai. Form data JSON ban kar
    // api/generate_ad.php ke paas jaata hai jahan MySQL use save karta hai.
    // ========================================================================
    document.getElementById('studioForm').addEventListener('submit', async (e) => {
        // e.preventDefault(): submit par page refresh hone se rokta hai
        e.preventDefault();

        // JS validation me koi problem mili to yahin ruk jaata hai
        if (!validateStudioForm()) {
            showToast('Please fix the highlighted fields');
            return;
        }

        const genBtn = document.getElementById('generateBtn');
        genBtn.disabled = true;
        genBtn.textContent = editingProjectId ? 'Updating...' : 'Creating Video...';

        // Har form input ki value ek saaf JS object me ikattha karta hai
        const payload = {
            product_name: document.getElementById('productName').value.trim(),
            product_desc: document.getElementById('productDesc').value.trim(),
            platform: document.getElementById('platformSelect').value,
            aspect_ratio: ratioSelect.value,
            ad_language: 'English',
            category: selectedCategory
        };

        try {
            // UPDATE mode: campaign id bhej kar api/update_ad.php call hoti hai
            if (editingProjectId) {
                payload.id = editingProjectId;
                const updRes = await fetch('api/update_ad.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const updData = await updRes.json();
                if (!updData.success || !updData.project) {
                    throw new Error(updData.message || 'Update failed');
                }
                loadProjectIntoUI(updData.project, true);
                stopEdit();
                await loadSavedAds();
                showToast('Campaign updated in MySQL');
                return;
            }

            // PHP API ko JSON POST request bhejta hai
            const res = await fetch('api/generate_ad.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (data.success && data.project) {
                if (uploadedCustomPhotos.length > 0) {
                    data.project.custom_image = true;
                    customPhotosByProject[data.project.id] = [...uploadedCustomPhotos];
                }
                loadProjectIntoUI(data.project, true);
                await loadSavedAds();
                showToast('Commercial video created & saved to MySQL');
            } else {
                throw new Error(data.message || 'API fallback');
            }
        } catch (err) {
            // XAMPP band ho ya file direct khuli ho to local project se kaam chala leta hai
            const localProj = buildLocalFallbackProject(
                payload.product_name,
                payload.product_desc,
                payload.platform,
                payload.aspect_ratio,
                'English',
                payload.category
            );
            if (uploadedCustomPhotos.length > 0) {
                customPhotosByProject[localProj.id] = [...uploadedCustomPhotos];
            }
            savedProjects.unshift(localProj);
            loadProjectIntoUI(localProj, true);
            renderSavedCards();
            showToast('Commercial video updated');
        } finally {
            genBtn.disabled = false;
            genBtn.textContent = editingProjectId ? 'Update Campaign' : 'Generate Video Ad';
        }
    });

    // ========================================================================
    // 6. LIVE SCENE TEXT EDITOR AUR COPY CAPTION
    // 'input' event har key press par chalta hai. Headline ya subline badalte hi
    // canvas ka frame dobara ban jaata hai.
    // ========================================================================
    const edHead = document.getElementById('editHeadline');
    const edSub = document.getElementById('editSubtext');
    [edHead, edSub].forEach((inp) => {
        inp.addEventListener('input', () => {
            if (!currentProject || !currentProject.scenes[selectedSceneIdx]) return;
            currentProject.scenes[selectedSceneIdx].headline = edHead.value;
            currentProject.scenes[selectedSceneIdx].subtext = edSub.value;
            engine.renderFrame();
        });
    });

    // Clipboard API (navigator.clipboard.writeText): ek click me ready caption
    // aur hashtags copy ho jaate hain.
    document.getElementById('copyCaptionBtn').addEventListener('click', () => {
        if (!currentProject) return;
        navigator.clipboard.writeText(`${currentProject.caption_text}\n\n${currentProject.hashtags}`);
        showToast('Caption copied to clipboard');
    });

    // ========================================================================
    // 7. CREATOR ACCOUNT FORM -> PHP + MYSQL LOGIN / SIGNUP
    // User details api/auth_api.php ko jaati hain, jahan password hash ho kar
    // MySQL users table me save ya verify hota hai.
    // ========================================================================
    document.getElementById('accountForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fullName = document.getElementById('accName').value.trim();
        const email = document.getElementById('accEmail').value.trim();
        const password = document.getElementById('accPass').value;

        try {
            const res = await fetch('api/auth_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'save_account',
                    full_name: fullName,
                    email: email,
                    password: password
                })
            });
            const data = await res.json();
            if (!data.success) {
                showToast(data.message || 'Login error');
                return;
            }
            const lbl = document.getElementById('userLabel');
            lbl.textContent = data.user.full_name;
            lbl.style.display = 'inline';
            await loadSavedAds();
            openView('studio');
            showToast('Signed in as ' + data.user.full_name);
        } catch (err) {
            const lbl = document.getElementById('userLabel');
            lbl.textContent = fullName;
            lbl.style.display = 'inline';
            openView('studio');
            showToast('Signed in as ' + fullName);
        }
    });

    // ========================================================================
    // 8. UI HELPER FUNCTION AUR SAVED CAMPAIGNS (MYSQL LIST + DELETE)
    // ========================================================================

    // Project loader: title, format, caption, scene buttons aur canvas video
    // sab ek saath update karta hai.
    function loadProjectIntoUI(proj, autoPlay) {
        currentProject = proj;
        selectedSceneIdx = 0;

        document.getElementById('stageBrandTitle').textContent = `${proj.product_name} — ${proj.platform}`;
        ratioSelect.value = proj.aspect_ratio || '9:16';

        renderScenePills();
        populateQuickEdit(0);

        document.getElementById('metaFormat').textContent = `${proj.aspect_ratio || '9:16'} • 4 Scenes`;
        document.getElementById('metaPlatform').textContent = proj.platform || 'Instagram Reels';
        document.getElementById('captionText').textContent = proj.caption_text || '';
        document.getElementById('hashtagsText').textContent = proj.hashtags || '';

        engine.loadProject(proj, autoPlay);
        playPauseBtn.textContent = autoPlay ? 'Pause' : 'Play';
    }

    // Scene 1, 2, 3 aur 4 ke button banata hai. Kisi bhi scene button par click
    // karne se video seedha us scene par chala jaata hai.
    function renderScenePills() {
        const box = document.getElementById('scenePillsBox');
        box.innerHTML = '';
        currentProject.scenes.forEach((sc, idx) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'scene-pill' + (idx === selectedSceneIdx ? ' active' : '');
            b.textContent = `Scene ${idx + 1}`;
            b.addEventListener('click', () => {
                selectedSceneIdx = idx;
                engine.jumpToScene(idx);
                populateQuickEdit(idx);
            });
            box.appendChild(b);
        });
    }

    // Chal rahe scene ka text edit inputs me bhar deta hai.
    function populateQuickEdit(idx) {
        const sc = currentProject?.scenes?.[idx];
        if (!sc) return;
        edHead.value = sc.headline || '';
        edSub.value = sc.subtext || '';
    }

    // Saved campaigns ka grid banata hai: MySQL se aaye har project ke liye
    // ek photo card, Edit button aur delete button.
    function renderSavedCards() {
        const grid = document.getElementById('savedAdsGrid');
        if (!grid) return;
        grid.innerHTML = '';

        savedProjects.forEach((p) => {
            const imgKey = p.scenes?.[0]?.image_key || 'food_1';
            const customThumb = customPhotosByProject[p.id]?.[0];
            const bgUrl = customThumb || (window.ADGENIUS_MEDIA && window.ADGENIUS_MEDIA[imgKey]) || 'assets/images/food_ad.jpg';
            const card = document.createElement('div');
            card.className = 'saved-card';
            card.innerHTML = `
                <div class="saved-thumb" style="background-image:url('${bgUrl}')"></div>
                <div class="saved-body">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <strong style="font-size:0.9rem;">${p.product_name}</strong>
                        <span class="tag-pill">${p.aspect_ratio}</span>
                    </div>
                    <p style="font-size:0.78rem; color:var(--text-muted); margin-top:5px;">${p.platform} • ${p.created_at || 'Saved'}</p>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
                        <span style="font-size:0.76rem; color:var(--accent); font-weight:600;">Open in Studio</span>
                        <span>
                            <button type="button" class="btn btn-outline btn-sm edit-btn edit-campaign-btn">Edit</button>
                            <button type="button" class="btn btn-outline btn-sm del-btn" style="padding:4px 9px; font-size:0.72rem;">Delete</button>
                        </span>
                    </div>
                </div>
            `;

            // Card par click karne se wo campaign studio me khulta hai aur chalne lagta hai
            card.addEventListener('click', (ev) => {
                if (ev.target.classList.contains('del-btn') || ev.target.classList.contains('edit-campaign-btn')) return;
                if (customPhotosByProject[p.id]) {
                    uploadedCustomPhotos = [...customPhotosByProject[p.id]];
                    p.custom_image = true;
                    renderUploadedThumbnails();
                    engine.setCustomImages(uploadedCustomPhotos, () => loadProjectIntoUI(p, true));
                } else {
                    uploadedCustomPhotos = [];
                    renderUploadedThumbnails();
                    engine.clearCustomImages();
                    loadProjectIntoUI(p, true);
                }
                openView('studio');
            });

            // Edit button is campaign ko studio form me load karta hai (CRUD ka Update)
            card.querySelector('.edit-campaign-btn').addEventListener('click', (ev) => {
                ev.stopPropagation();
                startEdit(p);
            });

            // Delete button api/projects_api.php se MySQL row hata deta hai
            const delBtn = card.querySelector('.del-btn');
            delBtn.addEventListener('click', async (ev) => {
                ev.stopPropagation();
                try {
                    await fetch('api/projects_api.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'delete', project_id: p.id })
                    });
                } catch (e) {
                    // Offline mode me local list se hata deta hai
                }
                savedProjects = savedProjects.filter((item) => item.id !== p.id);
                renderSavedCards();
                showToast('Campaign deleted');
            });

            grid.appendChild(card);
        });
    }

    // ========================================================================
    // SEARCH (assignment ki requirement)
    // Keyword type karte hi saved campaigns filter hote hain. Server chalu ho to
    // api/projects_api.php?action=search&q=... (SQL LIKE) call hoti hai,
    // server band ho to local array filter kar lete hain.
    // ========================================================================
    async function searchCampaigns(term) {
        const info = document.getElementById('searchInfo');
        const clean = term.trim();

        if (!clean) {
            if (info) info.textContent = '';
            await loadSavedAds();
            return;
        }

        try {
            const res = await fetch('api/projects_api.php?action=search&q=' + encodeURIComponent(clean));
            const data = await res.json();
            if (data.success && Array.isArray(data.projects)) {
                savedProjects = data.projects;
                renderSavedCards();
                if (info) info.textContent = data.projects.length + ' campaign(s) found for "' + clean + '"';
                return;
            }
        } catch (err) {
            // Offline: local list hi filter kar lete hain
        }

        const q = clean.toLowerCase();
        savedProjects = savedProjects.filter((p) =>
            (p.product_name || '').toLowerCase().includes(q) ||
            (p.category || '').toLowerCase().includes(q) ||
            (p.platform || '').toLowerCase().includes(q)
        );
        renderSavedCards();
        if (info) info.textContent = savedProjects.length + ' campaign(s) found for "' + clean + '" (offline)';
    }

    document.getElementById('searchBtn').addEventListener('click', () => {
        searchCampaigns(document.getElementById('searchInput').value);
    });

    document.getElementById('searchInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchCampaigns(e.target.value);
        }
    });

    document.getElementById('clearSearchBtn').addEventListener('click', () => {
        document.getElementById('searchInput').value = '';
        document.getElementById('searchInfo').textContent = '';
        loadSavedAds();
    });

    // MySQL se saved campaigns laata hai (api/projects_api.php?action=list).
    async function loadSavedAds() {
        try {
            const res = await fetch('api/projects_api.php?action=list');
            const data = await res.json();
            if (data.success && Array.isArray(data.projects) && data.projects.length > 0) {
                savedProjects = data.projects;
                renderSavedCards();
                return savedProjects;
            }
        } catch (err) {
            // Offline mode me 2 ready sample dikha deta hai
        }

        if (savedProjects.length === 0) {
            savedProjects = [
                buildLocalFallbackProject(presets.food.name, presets.food.desc, 'Instagram Reels', '9:16', 'English', 'food'),
                buildLocalFallbackProject(presets.study.name, presets.study.desc, 'Instagram Reels', '9:16', 'English', 'study')
            ];
        }
        renderSavedCards();
        return savedProjects;
    }

    // Shuru me apne aap chalne wala function: site khulte hi pehla commercial
    // load kar ke 60fps par chala deta hai.
    (async () => {
        const list = await loadSavedAds();
        if (list && list.length > 0) {
            loadProjectIntoUI(list[0], true);
        }
    })();
});