document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // UTILITIES
    // ==========================================
    const DOMElements = {
        themeToggle: document.getElementById('theme-toggle'),
        globalSearch: document.getElementById('global-search'),
        greetingText: document.getElementById('greeting-text'),
        userName: document.getElementById('user-name'),
        widgetGrid: document.getElementById('widget-grid'),
        toastContainer: document.getElementById('toast-container'),
        // Widgets
        clockTime: document.getElementById('time'),
        clockDate: document.getElementById('date'),
        weatherTemp: document.getElementById('temperature'),
        weatherDesc: document.getElementById('weather-desc'),
        weatherCity: document.getElementById('weather-city'),
        weatherIcon: document.querySelector('.weather-icon'),
        // Pomodoro
        pomoTime: document.getElementById('pomodoro-time'),
        pomoStart: document.getElementById('pomodoro-start'),
        pomoPause: document.getElementById('pomodoro-pause'),
        pomoReset: document.getElementById('pomodoro-reset'),
        pomoModes: document.querySelectorAll('.mode-btn'),
        // Todo
        todoForm: document.getElementById('todo-form'),
        todoInput: document.getElementById('todo-input'),
        todoList: document.getElementById('todo-list'),
        todoMic: document.getElementById('todo-mic'),
        // Notes
        noteForm: document.getElementById('note-form'),
        noteTitle: document.getElementById('note-title'),
        noteInput: document.getElementById('note-input'),
        notesList: document.getElementById('notes-list'),
        noteMic: document.getElementById('note-mic'),
        // Habits
        habitForm: document.getElementById('habit-form'),
        habitInput: document.getElementById('habit-input'),
        habitList: document.getElementById('habit-list'),
        // Books
        bookForm: document.getElementById('book-form'),
        bookInput: document.getElementById('book-input'),
        bookList: document.getElementById('book-list'),
        // Calendar
        prevMonthBtn: document.getElementById('prev-month'),
        nextMonthBtn: document.getElementById('next-month'),
        monthYearText: document.getElementById('month-year'),
        calendarDays: document.getElementById('calendar-days'),
        calEventInput: document.getElementById('cal-event-input'),
        addCalEventBtn: document.getElementById('add-cal-event'),
        calEventList: document.getElementById('cal-event-list'),
        // Stats
        statTasks: document.getElementById('stat-tasks'),
        statHabits: document.getElementById('stat-habits'),
    };

    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        DOMElements.toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Attempt browser notifications
    if ("Notification" in window) {
        Notification.requestPermission();
    }
    function sendNotification(title, body) {
        if ("Notification" in window && Notification.permission === "granted") {
            new Notification(title, { body });
        } else {
            showToast(`${title}: ${body}`);
        }
    }

    // ==========================================
    // THEME & CORE
    // ==========================================
    const Core = {
        init() {
            this.loadTheme();
            this.loadUser();
            this.initDragAndDrop();
            this.bindEvents();
            this.updateGreeting();
            setInterval(() => this.updateGreeting(), 60000); // Check every minute
        },
        loadTheme() {
            const savedTheme = localStorage.getItem('dashboard_theme');
            if (savedTheme === 'light') {
                document.body.classList.add('light-mode');
            }
        },
        toggleTheme() {
            document.body.classList.toggle('light-mode');
            const isLight = document.body.classList.contains('light-mode');
            localStorage.setItem('dashboard_theme', isLight ? 'light' : 'dark');
        },
        loadUser() {
            const savedName = localStorage.getItem('dashboard_username');
            if (savedName) DOMElements.userName.textContent = savedName;

            DOMElements.userName.addEventListener('blur', () => {
                let name = DOMElements.userName.textContent.trim();
                if (!name) { name = 'User'; DOMElements.userName.textContent = name; }
                localStorage.setItem('dashboard_username', name);
            });
            DOMElements.userName.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); DOMElements.userName.blur(); }
            });
        },
        updateGreeting() {
            const hour = new Date().getHours();
            let greeting = 'Good Evening';
            if (hour >= 5 && hour < 12) greeting = 'Good Morning';
            else if (hour >= 12 && hour < 17) greeting = 'Good Afternoon';
            DOMElements.greetingText.textContent = greeting;
        },
        bindEvents() {
            DOMElements.themeToggle.addEventListener('click', () => this.toggleTheme());
            DOMElements.globalSearch.addEventListener('input', (e) => GlobalSearch.filter(e.target.value));
        },
        initDragAndDrop() {
            const grid = DOMElements.widgetGrid;
            const savedOrder = JSON.parse(localStorage.getItem('dashboard_widget_order'));
            if (savedOrder) {
                // Reorder DOM based on saved IDs
                savedOrder.forEach(id => {
                    const el = document.getElementById(id);
                    if (el) grid.appendChild(el);
                });
            }

            let draggedItem = null;
            const widgets = document.querySelectorAll('.widget');

            widgets.forEach(widget => {
                widget.addEventListener('dragstart', function (e) {
                    draggedItem = this;
                    setTimeout(() => this.classList.add('dragging'), 0);
                    e.dataTransfer.effectAllowed = 'move';
                });
                widget.addEventListener('dragend', function () {
                    this.classList.remove('dragging');
                    draggedItem = null;
                    Core.saveWidgetOrder();
                });
                widget.addEventListener('dragover', function (e) {
                    e.preventDefault(); // Necessary for drop to work
                    this.classList.add('drag-over');
                });
                widget.addEventListener('dragleave', function () {
                    this.classList.remove('drag-over');
                });
                widget.addEventListener('drop', function (e) {
                    e.preventDefault();
                    this.classList.remove('drag-over');
                    if (this !== draggedItem) {
                        // Insert dragged element before or after target based on mouse position
                        const rect = this.getBoundingClientRect();
                        const next = (e.clientY - rect.top) / (rect.bottom - rect.top) > .5;
                        grid.insertBefore(draggedItem, next ? this.nextSibling : this);
                    }
                });
            });
        },
        saveWidgetOrder() {
            const widgets = document.querySelectorAll('.widget');
            const order = Array.from(widgets).map(w => w.id);
            localStorage.setItem('dashboard_widget_order', JSON.stringify(order));
        }
    };

    // ==========================================
    // VOICE INPUT (Web Speech API)
    // ==========================================
    const VoiceInput = {
        init() {
            this.recognition = null;
            if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                this.recognition = new SpeechRecognition();
                this.recognition.continuous = false;
                this.recognition.interimResults = false;
                this.recognition.lang = 'en-US';
            }

            DOMElements.todoMic.addEventListener('click', () => this.startListening(DOMElements.todoInput, DOMElements.todoForm, DOMElements.todoMic));
            DOMElements.noteMic.addEventListener('click', () => this.startListening(DOMElements.noteInput, null, DOMElements.noteMic));
        },
        startListening(inputEl, autoSubmitForm, micBtn) {
            if (!this.recognition) {
                showToast("Voice input not supported in this browser.");
                return;
            }
            micBtn.classList.add('recording');
            this.recognition.start();

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                inputEl.value = transcript;
                if (autoSubmitForm) {
                    // Trigger form submission naturally
                    const submitEvent = new Event('submit', { cancelable: true });
                    autoSubmitForm.dispatchEvent(submitEvent);
                }
            };
            this.recognition.onend = () => micBtn.classList.remove('recording');
            this.recognition.onerror = (e) => {
                showToast("Voice recognition error: " + e.error);
                micBtn.classList.remove('recording');
            };
        }
    };

    // ==========================================
    // CLOCK & WEATHER
    // ==========================================
    const DashboardInfo = {
        init() {
            this.updateClock();
            setInterval(() => this.updateClock(), 1000);
            this.fetchWeather();
        },
        updateClock() {
            const now = new Date();
            DOMElements.clockTime.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            DOMElements.clockDate.textContent = now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
        },
        async fetchWeather() {
            navigator.geolocation.getCurrentPosition(async (pos) => {
                const { latitude, longitude } = pos.coords;
                this.getWeatherData(latitude, longitude);
                this.getCityName(latitude, longitude);
            }, () => {
                this.getWeatherData(40.7128, -74.0060); // NY Default
                DOMElements.weatherCity.textContent = "New York, USA";
            });
        },
        async getWeatherData(lat, lon) {
            try {
                const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
                const data = await res.json();
                if (data.current_weather) {
                    DOMElements.weatherTemp.textContent = `${Math.round(data.current_weather.temperature)}°C`;
                    const code = data.current_weather.weathercode;
                    let desc = 'Clear'; let emoji = '☀️';
                    if (code > 0 && code <= 3) { desc = 'Partly Cloudy'; emoji = '🌤️'; }
                    else if (code >= 45 && code <= 48) { desc = 'Foggy'; emoji = '🌫️'; }
                    else if (code >= 51 && code <= 67) { desc = 'Rainy'; emoji = '🌧️'; }
                    else if (code >= 71 && code <= 77) { desc = 'Snowy'; emoji = '❄️'; }
                    else if (code >= 95) { desc = 'Thunderstorm'; emoji = '⛈️'; }
                    DOMElements.weatherDesc.textContent = desc;
                    DOMElements.weatherIcon.textContent = emoji;
                }
            } catch (e) { DOMElements.weatherDesc.textContent = 'Weather Unavailable'; }
        },
        async getCityName(lat, lon) {
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`);
                const data = await res.json();
                if (data && data.address) {
                    const city = data.address.city || data.address.town || data.address.village || "Local Area";
                    DOMElements.weatherCity.textContent = city;
                }
            } catch (e) {
                DOMElements.weatherCity.textContent = "Location Error";
            }
        }
    };

    // ==========================================
    // POMODORO TIMER
    // ==========================================
    const Pomodoro = {
        timer: null,
        timeLeft: 25 * 60,
        isWorking: true,
        init() {
            this.updateDisplay();
            DOMElements.pomoStart.addEventListener('click', () => this.start());
            DOMElements.pomoPause.addEventListener('click', () => this.pause());
            DOMElements.pomoReset.addEventListener('click', () => this.reset());
            DOMElements.pomoModes.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    DOMElements.pomoModes.forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                    this.isWorking = e.target.textContent === 'Work';
                    this.timeLeft = parseInt(e.target.dataset.time) * 60;
                    this.pause();
                    this.updateDisplay();
                });
            });
        },
        updateDisplay() {
            const mins = Math.floor(this.timeLeft / 60);
            const secs = this.timeLeft % 60;
            DOMElements.pomoTime.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        },
        start() {
            if (this.timer) return;
            this.timer = setInterval(() => {
                this.timeLeft--;
                this.updateDisplay();
                if (this.timeLeft <= 0) {
                    this.pause();
                    sendNotification("Pomodoro Timer", this.isWorking ? "Work session complete! Take a short break." : "Break time over! Back to work.");
                    // Auto switch mode
                    const targetMode = this.isWorking ? 'Break' : 'Work';
                    const nextBtn = Array.from(DOMElements.pomoModes).find(b => b.textContent === targetMode);
                    if (nextBtn) nextBtn.click();
                }
            }, 1000);
        },
        pause() {
            clearInterval(this.timer);
            this.timer = null;
        },
        reset() {
            this.pause();
            const activeMode = Array.from(DOMElements.pomoModes).find(b => b.classList.contains('active'));
            this.timeLeft = parseInt(activeMode.dataset.time) * 60;
            this.updateDisplay();
        }
    };

    // ==========================================
    // TO-DO LIST
    // ==========================================
    const Todo = {
        todos: JSON.parse(localStorage.getItem('dashboard_todos_v2')) || JSON.parse(localStorage.getItem('dashboard_todos')) || [],
        init() {
            this.render();
            DOMElements.todoForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const text = DOMElements.todoInput.value.trim();
                if (text) {
                    this.todos.unshift({ text, completed: false, id: Date.now() });
                    DOMElements.todoInput.value = '';
                    this.save();
                    this.render();
                    Stats.update();
                }
            });
            // Global scope methods for onclick handlers
            window.toggleTodo = (id) => {
                const todo = this.todos.find(t => t.id === id);
                if (todo) {
                    todo.completed = !todo.completed;
                    this.save();
                    this.render(DOMElements.globalSearch.value);
                    Stats.update();
                }
            };
            window.deleteTodo = (id) => {
                this.todos = this.todos.filter(t => t.id !== id);
                this.save();
                this.render(DOMElements.globalSearch.value);
                Stats.update();
            };
        },
        save() {
            localStorage.setItem('dashboard_todos_v2', JSON.stringify(this.todos));
        },
        render(filterText = '') {
            DOMElements.todoList.innerHTML = '';
            const filtered = this.todos.filter(t => t.text.toLowerCase().includes(filterText.toLowerCase()));
            filtered.forEach(todo => {
                const li = document.createElement('li');
                li.className = 'todo-item';
                if (todo.completed) li.classList.add('completed');
                li.innerHTML = `
                    <input type="checkbox" ${todo.completed ? 'checked' : ''} onchange="toggleTodo(${todo.id})">
                    <span class="todo-text" onclick="toggleTodo(${todo.id})">${todo.text}</span>
                    <button class="delete-btn" onclick="deleteTodo(${todo.id})" title="Delete">&times;</button>
                `;
                DOMElements.todoList.appendChild(li);
            });
        }
    };

    // ==========================================
    // NOTES WIDGET
    // ==========================================
    const Notes = {
        notes: JSON.parse(localStorage.getItem('dashboard_notes_list')) || [],
        editingId: null,
        init() {
            this.render();
            DOMElements.noteForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const title = DOMElements.noteTitle.value.trim();
                const body = DOMElements.noteInput.value.trim();
                if (body) {
                    if (this.editingId) {
                        const note = this.notes.find(n => n.id === this.editingId);
                        if (note) {
                            note.title = title; note.body = body; note.date = Date.now();
                        }
                        this.editingId = null;
                        DOMElements.noteForm.querySelector('.btn-primary').textContent = 'Save Note';
                    } else {
                        this.notes.unshift({ id: Date.now(), title, body, date: Date.now() });
                    }
                    DOMElements.noteTitle.value = '';
                    DOMElements.noteInput.value = '';
                    this.save();
                    this.render();
                }
            });

            window.deleteNote = (id) => {
                this.notes = this.notes.filter(n => n.id !== id);
                this.save();
                this.render(DOMElements.globalSearch.value);
            };
            window.editNote = (id) => {
                const note = this.notes.find(n => n.id === id);
                if (note) {
                    DOMElements.noteTitle.value = note.title;
                    DOMElements.noteInput.value = note.body;
                    this.editingId = id;
                    DOMElements.noteForm.querySelector('.btn-primary').textContent = 'Update Note';
                    DOMElements.noteInput.focus();
                }
            };
        },
        save() {
            localStorage.setItem('dashboard_notes_list', JSON.stringify(this.notes));
        },
        render(filterText = '') {
            DOMElements.notesList.innerHTML = '';
            const filtered = this.notes.filter(n =>
                n.title.toLowerCase().includes(filterText.toLowerCase()) ||
                n.body.toLowerCase().includes(filterText.toLowerCase())
            );
            filtered.forEach(note => {
                const div = document.createElement('div');
                div.className = 'note-item';
                const dateStr = new Date(note.date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                const titleHtml = note.title ? `<span>${note.title}</span>` : `<span style="font-style:italic">Untitled Note</span>`;
                div.innerHTML = `
                    <div class="note-header">
                        ${titleHtml}
                        <div class="note-controls">
                            <button class="edit-btn" onclick="editNote(${note.id})" title="Edit">✎</button>
                            <button class="delete-btn" onclick="deleteNote(${note.id})" title="Delete">&times;</button>
                        </div>
                    </div>
                    <div class="note-body">${note.body}</div>
                    <div class="note-date">${dateStr}</div>
                `;
                DOMElements.notesList.appendChild(div);
            });
        }
    };

    // ==========================================
    // HABITS
    // ==========================================
    const Habits = {
        habits: JSON.parse(localStorage.getItem('dashboard_habits_v2')) || JSON.parse(localStorage.getItem('dashboard_habits')) || [],
        days: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
        init() {
            // Check for v1 data migration
            this.habits = this.habits.map(h => {
                if (!h.id) { h.id = Date.now() + Math.random(); }
                return h;
            });

            this.render();
            DOMElements.habitForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const name = DOMElements.habitInput.value.trim();
                if (name) {
                    this.habits.unshift({ name, completedDays: [], id: Date.now() });
                    DOMElements.habitInput.value = '';
                    this.save();
                    this.render();
                    Stats.update();
                }
            });

            window.toggleHabitDay = (id, dayIndex) => {
                const habit = this.habits.find(h => h.id === id);
                if (habit) {
                    const pos = habit.completedDays.indexOf(dayIndex);
                    if (pos > -1) habit.completedDays.splice(pos, 1);
                    else habit.completedDays.push(dayIndex);
                    this.save();
                    this.render();
                    Stats.update();
                }
            };

            window.deleteHabit = (id) => {
                this.habits = this.habits.filter(h => h.id !== id);
                this.save();
                this.render();
                Stats.update();
            };
        },
        save() {
            localStorage.setItem('dashboard_habits_v2', JSON.stringify(this.habits));
        },
        render() {
            DOMElements.habitList.innerHTML = '';
            this.habits.forEach(habit => {
                const item = document.createElement('div');
                item.className = 'habit-item';
                let daysHtml = this.days.map((day, dIdx) => {
                    const isActive = habit.completedDays.includes(dIdx);
                    return `<button class="day-btn ${isActive ? 'active' : ''}" onclick="toggleHabitDay(${habit.id}, ${dIdx})">${day}</button>`;
                }).join('');
                item.innerHTML = `
                    <div class="habit-header">
                        <span>${habit.name}</span>
                        <button class="delete-btn" onclick="deleteHabit(${habit.id})" title="Delete">&times;</button>
                    </div>
                    <div class="days-grid">${daysHtml}</div>
                `;
                DOMElements.habitList.appendChild(item);
            });
        }
    };

    // ==========================================
    // CALENDAR
    // ==========================================
    const Calendar = {
        currentDate: new Date(),
        selectedDate: new Date(),
        events: JSON.parse(localStorage.getItem('dashboard_cal_events')) || {},
        init() {
            this.renderGrid();

            DOMElements.prevMonthBtn.addEventListener('click', () => {
                this.currentDate.setMonth(this.currentDate.getMonth() - 1);
                this.renderGrid();
            });
            DOMElements.nextMonthBtn.addEventListener('click', () => {
                this.currentDate.setMonth(this.currentDate.getMonth() + 1);
                this.renderGrid();
            });

            DOMElements.addCalEventBtn.addEventListener('click', () => {
                const text = DOMElements.calEventInput.value.trim();
                const dKey = this.selectedDate.toDateString();
                if (text) {
                    if (!this.events[dKey]) this.events[dKey] = [];
                    this.events[dKey].push({ id: Date.now(), text });
                    DOMElements.calEventInput.value = '';
                    this.save();
                    this.renderGrid();
                }
            });

            window.deleteCalEvent = (dKey, id) => {
                if (this.events[dKey]) {
                    this.events[dKey] = this.events[dKey].filter(e => e.id !== id);
                    if (this.events[dKey].length === 0) delete this.events[dKey];
                    this.save();
                    this.renderGrid();
                }
            };
        },
        save() {
            localStorage.setItem('dashboard_cal_events', JSON.stringify(this.events));
        },
        renderGrid() {
            const y = this.currentDate.getFullYear(), m = this.currentDate.getMonth();
            DOMElements.monthYearText.textContent = new Date(y, m).toLocaleDateString([], { month: 'long', year: 'numeric' });

            const firstDay = new Date(y, m, 1).getDay();
            const daysInMonth = new Date(y, m + 1, 0).getDate();

            DOMElements.calendarDays.innerHTML = '';

            // Empty slots for start of month
            for (let i = 0; i < firstDay; i++) {
                const empty = document.createElement('div');
                DOMElements.calendarDays.appendChild(empty);
            }

            // Day cells
            const today = new Date();
            for (let i = 1; i <= daysInMonth; i++) {
                const dayEl = document.createElement('div');
                dayEl.className = 'cal-day';
                dayEl.textContent = i;

                const d = new Date(y, m, i);
                const dKey = d.toDateString();

                if (d.toDateString() === today.toDateString()) dayEl.classList.add('today');
                if (d.toDateString() === this.selectedDate.toDateString()) dayEl.classList.add('selected');
                if (this.events[dKey] && this.events[dKey].length > 0) dayEl.classList.add('has-event');

                dayEl.addEventListener('click', () => {
                    this.selectedDate = d;
                    this.renderGrid();
                });

                DOMElements.calendarDays.appendChild(dayEl);
            }
            this.renderEvents();
        },
        renderEvents() {
            DOMElements.calEventList.innerHTML = '';
            const dKey = this.selectedDate.toDateString();
            DOMElements.calEventInput.placeholder = `Event for ${dKey.substring(4, 10)}...`;

            const dayEvents = this.events[dKey] || [];
            dayEvents.forEach(ev => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span>${ev.text}</span>
                    <button class="delete-btn" onclick="deleteCalEvent('${dKey}', ${ev.id})">&times;</button>
                `;
                DOMElements.calEventList.appendChild(li);
            });
        }
    };

    // ==========================================
    // STATS
    // ==========================================
    const Stats = {
        init() { this.update(); },
        update() {
            const completedTaskCount = Todo.todos.filter(t => t.completed).length;
            DOMElements.statTasks.textContent = completedTaskCount;

            const totalHabitSlots = Habits.habits.length * 7;
            const totalHabitsDone = Habits.habits.reduce((acc, h) => acc + h.completedDays.length, 0);
            const consistency = totalHabitSlots > 0 ? Math.round((totalHabitsDone / totalHabitSlots) * 100) : 0;
            DOMElements.statHabits.textContent = `${consistency}%`;
        }
    };

    // ==========================================
    // GLOBAL SEARCH
    // ==========================================
    const GlobalSearch = {
        filter(query) {
            Todo.render(query);
            Notes.render(query);
            Books.render(query);
        }
    };

    // ==========================================
    // BOOK LIST
    // ==========================================
    const Books = {
        books: JSON.parse(localStorage.getItem('dashboard_books')) || [],
        init() {
            this.render();
            DOMElements.bookForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const title = DOMElements.bookInput.value.trim();
                if (title) {
                    this.books.unshift({ title, finished: false, id: Date.now() });
                    DOMElements.bookInput.value = '';
                    this.save();
                    this.render();
                }
            });
            window.toggleBook = (id) => {
                const book = this.books.find(b => b.id === id);
                if (book) {
                    book.finished = !book.finished;
                    this.save();
                    this.render(DOMElements.globalSearch.value);
                }
            };
            window.deleteBook = (id) => {
                this.books = this.books.filter(b => b.id !== id);
                this.save();
                this.render(DOMElements.globalSearch.value);
            };
        },
        save() {
            localStorage.setItem('dashboard_books', JSON.stringify(this.books));
        },
        render(filterText = '') {
            DOMElements.bookList.innerHTML = '';
            const filtered = this.books.filter(b => b.title.toLowerCase().includes(filterText.toLowerCase()));
            filtered.forEach(book => {
                const li = document.createElement('li');
                if (book.finished) li.classList.add('completed');
                li.innerHTML = `
                    <input type="checkbox" ${book.finished ? 'checked' : ''} onchange="toggleBook(${book.id})">
                    <span class="todo-text" onclick="toggleBook(${book.id})">📖 ${book.title}</span>
                    <button class="delete-btn" onclick="deleteBook(${book.id})" title="Delete">&times;</button>
                `;
                DOMElements.bookList.appendChild(li);
            });
        }
    };

    // ==========================================
    // INIT ALL
    // ==========================================
    Core.init();
    VoiceInput.init();
    DashboardInfo.init();
    Pomodoro.init();
    Todo.init();
    Notes.init();
    Habits.init();
    Calendar.init();
    Stats.init();
    Books.init();

});
