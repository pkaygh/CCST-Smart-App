
        // 1. CONFIGURATION & STATE
        const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwSiq3BF4Upl898HwUW7oSxQGWyon6UKxm-jNZZ_g3_HvkfGbDAZZHDD_aTc7w5oa_H/exec";
        let studentData = null;
        let userResults = [];
        let db;

        // 2. GRADE HELPERS
        function getGradeClass(grade) {
            if (!grade) return '';
            const g = String(grade).toUpperCase().trim();
            if (g === 'A') return 'grade-a';
            if (g.startsWith('B')) return 'grade-b';
            if (g.startsWith('C')) return 'grade-c';
            if (g === 'F') return 'grade-f';
            return '';
        }

        function normalizeCourses(details) {
            if (!details) return [];
            if (Array.isArray(details)) return details;
            try {
                return JSON.parse(details);
            } catch (error) {
                return [];
            }
        }

        function normalizeResultRecord(result) {
            return {
                semester: result?.semester || 'Other',
                gpa: result?.gpa || '0.00',
                details: normalizeCourses(result?.details)
            };
        }

        function formatMoney(value) {
            const amount = Number(value || 0);
            return `GHS ${amount.toLocaleString()}`;
        }

        // 3. IMAGE UPLOADER
        async function uploadPhoto(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(e) {
                const img = new Image();
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 300;
                    const scaleSize = MAX_WIDTH / img.width;
                    canvas.width = MAX_WIDTH;
                    canvas.height = img.height * scaleSize;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);

                    document.getElementById('profilePic').src = compressedBase64;
                    document.getElementById('sidebarPhoto').src = compressedBase64;
                    if (studentData?.profile) {
                        studentData.profile.photoUrl = compressedBase64;
                        localStorage.setItem('userData', JSON.stringify(studentData));
                    }
                    savePhotoToServer(compressedBase64);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }

        async function savePhotoToServer(base64Data) {
            try {
                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'upload_photo',
                        id: studentData.profile.id,
                        photoData: base64Data
                    })
                });
                const data = await response.json();
                if (!data.success) {
                    throw new Error(data.message || 'Upload failed');
                }
                showToast('Profile photo synced to server!', 'success');
            } catch (error) {
                console.error('Photo upload error:', error);
                showToast('Offline: Photo saved locally only', 'warning');
            }
        }

        // 4. DISPLAY ACADEMIC RESULTS
        function displayFilteredTable(results) {
            const container = document.getElementById('resultsContainer');
            const normalized = (results || []).map(normalizeResultRecord).filter(r => r.details.length || r.semester || r.gpa);

            if (!normalized.length) {
                container.innerHTML = '<div style="text-align:center; padding:40px; color:#666;">No results found.</div>';
                return;
            }

            const grouped = {};
            normalized.forEach(result => {
                if (!grouped[result.semester]) grouped[result.semester] = [];
                grouped[result.semester].push(result);
            });

            let html = '';
            Object.keys(grouped).forEach((semester) => {
                const semesterResults = grouped[semester];
                const semGPA = semesterResults[0]?.gpa || '0.00';
                const courses = semesterResults.flatMap(item => item.details || []);
                html += `
                    <div class="semester-card">
                        <div class="semester-header">
                            <h3>${semester}</h3>
                            <div class="gpa-badge">GPA: ${semGPA}</div>
                        </div>
                        <div class="course-grid">
                            <div class="course-header">Course Title</div>
                            <div class="course-header" style="text-align:center">Credits</div>
                            <div class="course-header" style="text-align:center">Grade</div>
                            ${courses.length ? courses.map((course) => {
                                const grade = course.grade || 'N/A';
                                const title = course.name || course.courseName || course.code || 'Untitled Course';
                                const credits = course.credits || course.credit || course.unit || '-';
                                return `
                                    <div class="course-item">${title}</div>
                                    <div class="course-item" style="text-align:center">${credits}</div>
                                    <div class="course-item ${getGradeClass(grade)}" style="text-align:center">${grade}</div>
                                `;
                            }).join('') : '<div class="course-item" style="grid-column: 1 / span 3; text-align:center;">No course breakdown available.</div>'}
                        </div>
                    </div>`;
            });

            container.innerHTML = html;
        }

        function hydrateProfile(profile) {
            document.getElementById('userName').innerText = profile.name || 'Student';
            document.getElementById('userLevel').innerText = profile.level || '-';
            document.getElementById('profileName').innerText = profile.name || '-';
            document.getElementById('profileID').innerText = profile.id || '-';
            document.getElementById('profileProgram').innerText = profile.program || '-';
            const feesValue = profile.arrears ?? profile.balance ?? 0;
            const feeNode = document.getElementById('profileFees');
            if (feeNode) feeNode.innerText = formatMoney(feesValue);

            if (profile.photoUrl) {
                document.getElementById('profilePic').src = profile.photoUrl;
                document.getElementById('sidebarPhoto').src = profile.photoUrl;
            }
        }

        // 5. DATA FETCHING & UI NAVIGATION
        async function fetchStudentData() {
            try {
                const response = await fetch(`${SCRIPT_URL}?action=get_student_data&id=${encodeURIComponent(studentData.profile.id)}`);
                const data = await response.json();
                if (!data.success || !data.profile) {
                    throw new Error(data.error || 'Unable to load student data');
                }
                studentData = data;
                userResults = data.results || [];
                localStorage.setItem('userData', JSON.stringify(data));
                localStorage.setItem('userResults', JSON.stringify(userResults));
                hydrateProfile(data.profile);
                displayFilteredTable(userResults);
            } catch (error) {
                console.log('Using cached data...', error);
                displayFilteredTable(userResults);
            }
        }

        function showSection(sectionId, evt) {
            document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
            document.querySelectorAll('.sidebar-nav a, .menu-item').forEach(link => link.classList.remove('active'));
            document.getElementById(sectionId).classList.add('active');
            const trigger = evt || window.event;
            trigger?.currentTarget?.classList?.add('active');
        }

        function showToast(msg, type = 'info') {
            const toast = document.getElementById('toast');
            toast.innerText = msg;
            toast.className = `toast ${type}`;
            toast.style.display = 'block';
            setTimeout(() => toast.style.display = 'none', 3000);
        }

        function logout() {
            if (confirm('Logout of your CCST Portal?')) {
                localStorage.removeItem('userData');
                localStorage.removeItem('userResults');
                localStorage.removeItem('studentId');
                window.location.replace('index.html');
            }
        }

        // 6. INITIALIZATION
        window.onload = async function () {
            const storedData = localStorage.getItem('userData');
            if (!storedData) {
                window.location.replace('index.html');
                return;
            }

            studentData = JSON.parse(storedData);
            if (!studentData.profile) {
                window.location.replace('index.html');
                return;
            }

            userResults = JSON.parse(localStorage.getItem('userResults') || '[]');
            hydrateProfile(studentData.profile);
            displayFilteredTable(userResults);
            await fetchStudentData();
            showSection('profile');
        };

    