
        // Configuration
        const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwSiq3BF4Upl898HwUW7oSxQGWyon6UKxm-jNZZ_g3_HvkfGbDAZZHDD_aTc7w5oa_H/exec";
        let deferredPrompt;
        let currentRole = 'student';

        function selectRole(role) {
            currentRole = role;
            const studentRole = document.getElementById('studentRole');
            const adminRole = document.getElementById('adminRole');
            const idLabel = document.getElementById('idLabel');
            const loginId = document.getElementById('loginId');

            if (role === 'student') {
                studentRole.classList.add('active');
                adminRole.classList.remove('active');
                idLabel.innerText = 'Student ID';
                loginId.placeholder = 'Enter your student ID';
            } else {
                adminRole.classList.add('active');
                studentRole.classList.remove('active');
                idLabel.innerText = 'Admin ID';
                loginId.placeholder = 'Enter admin ID';
            }
        }

        function updateOnlineStatus() {
            const notice = document.getElementById('offlineNotice');
            if (!notice) return;
            notice.classList.toggle('show', !navigator.onLine);
        }

        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            document.getElementById('installBanner')?.classList.add('show');
        });

        function installPWA() {
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then(() => {
                deferredPrompt = null;
                document.getElementById('installBanner')?.classList.remove('show');
            });
        }

        function showError(msg) {
            const errorMsg = document.getElementById('errorMessage');
            if (!errorMsg) return;
            errorMsg.innerText = msg;
            errorMsg.style.display = 'block';
            setTimeout(() => {
                errorMsg.style.display = 'none';
            }, 5000);
        }

        async function handleLogin(event) {
            event.preventDefault();

            const loginId = document.getElementById('loginId').value.trim();
            const password = document.getElementById('password').value;
            const loginBtn = document.getElementById('loginBtn');
            const loginText = document.getElementById('loginText');
            const loginSpinner = document.getElementById('loginSpinner');
            const errorMsg = document.getElementById('errorMessage');

            if (!loginId || !password) {
                showError('Please enter your ID and password.');
                return;
            }

            loginBtn.disabled = true;
            loginText.style.display = 'none';
            loginSpinner.style.display = 'inline-block';
            errorMsg.style.display = 'none';

            try {
                if (!navigator.onLine) {
                    if (currentRole !== 'student') {
                        showError('Admin login requires an internet connection.');
                        return;
                    }
                    const cachedData = localStorage.getItem('userData');
                    if (cachedData) {
                        const data = JSON.parse(cachedData);
                        if (data.profile && data.profile.id === loginId) {
                            window.location.href = 'dashboard.html';
                            return;
                        }
                    }
                    showError('You are offline. Please connect to login.');
                    return;
                }

                if (currentRole === 'admin') {
                    const response = await fetch(`${SCRIPT_URL}?action=staff_login&user=${encodeURIComponent(loginId)}&pass=${encodeURIComponent(password)}`);
                    const data = await response.json();
                    if (!data.authorized) {
                        showError(data.error || 'Invalid Credentials');
                        return;
                    }
                    localStorage.setItem('adminData', JSON.stringify({ role: 'admin', id: loginId }));
                    window.location.href = 'accountant.html';
                    return;
                }

                const response = await fetch(`${SCRIPT_URL}?id=${encodeURIComponent(loginId)}&password=${encodeURIComponent(password)}`);
                const data = await response.json();

                if (data.error || !data.profile) {
                    showError(data.error || 'Invalid ID or Password');
                    return;
                }

                localStorage.setItem('userData', JSON.stringify(data));
                localStorage.setItem('studentId', loginId);
                localStorage.setItem('userResults', JSON.stringify(data.results || []));
                localStorage.removeItem('adminData');
                window.location.href = 'dashboard.html';
            } catch (error) {
                console.error('Login error:', error);
                showError('Connection error. Ensure the Web App is deployed correctly and try again.');
            } finally {
                loginBtn.disabled = false;
                loginText.style.display = 'inline';
                loginSpinner.style.display = 'none';
            }
        }

        function openRegisterModal() {
            document.getElementById('registerModal').classList.add('show');
            document.getElementById('registerError').style.display = 'none';
        }

        function closeRegisterModal() {
            document.getElementById('registerModal').classList.remove('show');
            document.getElementById('registerForm').reset();
        }

        async function handleRegister(event) {
            event.preventDefault();

            const name = document.getElementById('regName').value.trim();
            const id = document.getElementById('regId').value.trim();
            const program = document.getElementById('regProgram').value.trim();
            const level = document.getElementById('regLevel').value.trim();
            const password = document.getElementById('regPassword').value;
            const confirmPassword = document.getElementById('regConfirmPassword').value;
            const errorMsg = document.getElementById('registerError');
            const registerBtn = document.getElementById('registerBtn');
            const registerText = document.getElementById('registerText');
            const registerSpinner = document.getElementById('registerSpinner');

            if (!name || !id || !program || !level || !password) {
                errorMsg.innerText = 'All fields are required';
                errorMsg.style.display = 'block';
                return;
            }

            if (password !== confirmPassword) {
                errorMsg.innerText = 'Passwords do not match';
                errorMsg.style.display = 'block';
                return;
            }

            if (password.length < 6) {
                errorMsg.innerText = 'Password must be at least 6 characters';
                errorMsg.style.display = 'block';
                return;
            }

            registerBtn.disabled = true;
            registerText.style.display = 'none';
            registerSpinner.style.display = 'inline-block';
            errorMsg.style.display = 'none';

            try {
                if (!navigator.onLine) {
                    errorMsg.innerText = 'Registration requires internet connection';
                    errorMsg.style.display = 'block';
                    return;
                }

                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'register',
                        name,
                        id,
                        program,
                        level,
                        password
                    })
                });
                const data = await response.json();

                if (!data.success) {
                    errorMsg.innerText = data.error || 'Registration failed. Please try again.';
                    errorMsg.style.display = 'block';
                    return;
                }

                alert('Registration successful! Please login with your Student ID and password.');
                closeRegisterModal();
                document.getElementById('loginId').value = id;
                document.getElementById('password').value = '';
                selectRole('student');
            } catch (error) {
                console.error('Registration error:', error);
                errorMsg.innerText = 'Connection error. Please try again.';
                errorMsg.style.display = 'block';
            } finally {
                registerBtn.disabled = false;
                registerText.style.display = 'inline';
                registerSpinner.style.display = 'none';
            }
        }

        window.onload = function() {
            updateOnlineStatus();
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('sw.js')
                    .then((registration) => console.log('SW registered:', registration.scope))
                    .catch((error) => console.log('SW registration failed:', error));
            }
        };

        document.getElementById('registerModal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeRegisterModal();
            }
        });

    