/**
 * js/chat.js
 * Real-Time Group Chat Module for All Users
 */

window.AppChat = {
    messagesListener: null,

    render: function() {
        return [
            '<div class="space-y-4 max-w-full mx-auto h-[calc(100vh-8.5rem)] md:h-[calc(100vh-7rem)] flex flex-col">',
            '  <!-- Header Card -->',
            '  <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm flex-shrink-0 flex items-center justify-between">',
            '    <div class="flex items-center gap-3">',
            '      <div class="relative">',
            '        <div class="w-10 h-10 rounded-full bg-primary-100 dark:bg-slate-700 flex items-center justify-center text-primary-600 dark:text-primary-400">',
            '          <i data-lucide="message-square" class="w-5 h-5"></i>',
            '        </div>',
            '        <span class="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"></span>',
            '      </div>',
            '      <div>',
            '        <h2 class="text-base font-bold text-slate-900 dark:text-white">Forum Diskusi &amp; Chat Staf</h2>',
            '        <p class="text-xs text-slate-500 dark:text-slate-400">Saling tanya jawab, diskusi, dan koordinasi dengan seluruh staf secara realtime.</p>',
            '      </div>',
            '    </div>',
            '    <div class="hidden sm:flex items-center gap-2 bg-slate-50 dark:bg-slate-900/40 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">',
            '      <i data-lucide="info" class="w-4 h-4 text-primary-500"></i>',
            '      <span>Semua pesan sinkron secara otomatis dan instan</span>',
            '    </div>',
            '  </div>',
            '  ',
            '  <!-- Chat Workspace -->',
            '  <div id="chat-workspace-panel" class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex-1 flex flex-col overflow-hidden min-h-0">',
            '    <div class="flex-1 flex justify-center items-center py-20"><div class="spinner"></div></div>',
            '  </div>',
            '</div>'
        ].join('');
    },

    init: function() {
        // FITUR BARU: tandai halaman Chat sedang aktif & langsung hapus badge
        // titik merah + simpan status "sudah dibaca" (lihat startChatNotifWatcher di app.js).
        window._chatPageActive = true;
        if (typeof window.markChatAsRead === 'function') window.markChatAsRead();
        this.setupRealtimeChat();
    },

    destroy: function() {
        // FITUR BARU: halaman Chat ditutup, notifikasi pesan baru aktif kembali.
        window._chatPageActive = false;
        if (this.messagesListener) {
            this.messagesListener();
            this.messagesListener = null;
        }
        if (this._docClickHandler) {
            document.removeEventListener('click', this._docClickHandler);
            this._docClickHandler = null;
        }
    },

    setupRealtimeChat: function() {
        var self = this;
        var panel = document.getElementById('chat-workspace-panel');
        if (!panel) return;

        // Render the main chat workspace skeleton inside the panel with Emoji Picker container
        panel.innerHTML = [
            '<div class="flex-1 flex flex-col overflow-hidden min-h-0 relative">',
            '  <!-- Message Area -->',
            '  <div id="chat-messages-area" class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50 dark:bg-slate-900/10">',
            '    <div class="flex justify-center py-20"><div class="spinner"></div></div>',
            '  </div>',
            '  ',
            '  <!-- Input Controls Footer -->',
            '  <div class="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex-shrink-0">',
            '    <div class="flex items-end gap-2 sm:gap-3 w-full relative">',
            '      <!-- Emoji Picker Popover -->',
            '      <div id="emoji-picker-container" class="hidden absolute bottom-14 left-0 sm:left-4 z-50 w-72 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150">',
            '        <!-- Rendered dynamically -->',
            '      </div>',
            '      ',
            '      <div class="flex-1 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:border-primary-500 transition-all px-3 py-2 flex flex-col gap-1 min-h-[46px]">',
            '        <textarea id="chat-input" rows="3" placeholder="Tulis pesan atau pertanyaan di sini... (Enter untuk baris baru)" class="w-full bg-transparent border-0 outline-none resize-none text-sm sm:text-base leading-relaxed text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 max-h-64" style="height: 72px;"></textarea>',
            '        <div class="flex items-center justify-between text-[10px] text-slate-400 select-none">',
            '          <div class="flex items-center gap-1.5">',
            '            <span>Tekan <kbd class="px-1 py-0.5 bg-slate-200/50 dark:bg-slate-800 rounded font-mono">Ctrl</kbd> + <kbd class="px-1 py-0.5 bg-slate-200/50 dark:bg-slate-800 rounded font-mono">Enter</kbd> untuk kirim</span>',
            '            <span class="text-slate-300 dark:text-slate-600">|</span>',
            '            <button type="button" id="emoji-trigger-btn" onclick="AppChat.toggleEmojiPicker(event)" class="text-slate-500 hover:text-primary-500 flex items-center gap-1 font-semibold text-xs transition active:scale-95">',
            '              <i data-lucide="smile" class="w-4 h-4"></i>',
            '              <span>Emoji</span>',
            '            </button>',
            '          </div>',
            '          <span id="char-counter">0/1000</span>',
            '        </div>',
            '      </div>',
            '      <button id="chat-send-btn" onclick="AppChat.sendMessage()" class="flex-shrink-0 h-[46px] w-[46px] rounded-xl bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center transition shadow-sm hover:shadow active:scale-95">',
            '        <i data-lucide="send" class="w-5 h-5"></i>',
            '      </button>',
            '    </div>',
            '  </div>',
            '</div>'
        ].join('');

        // Populate Emoji Picker HTML
        var pickerEl = document.getElementById('emoji-picker-container');
        if (pickerEl) {
            pickerEl.innerHTML = this.renderEmojiPickerHtml();
        }

        if (window.lucide) lucide.createIcons({ el: panel });

        // Add keydown and input listeners for the textarea
        var input = document.getElementById('chat-input');
        if (input) {
            input.focus();
            input.addEventListener('input', function() {
                // Auto-expand textarea height
                this.style.height = 'auto';
                var newHeight = Math.max(this.scrollHeight, 72);
                this.style.height = newHeight + 'px';
                if (parseInt(this.style.height) > 256) {
                    this.style.height = '256px';
                }
                self.updateCharCount();
            });

            input.addEventListener('keydown', function(e) {
                // Enter now only creates a new line (default textarea behavior).
                // Sending is triggered with Ctrl+Enter (or Cmd+Enter on Mac).
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    self.sendMessage();
                }
            });
        }

        // Close picker when clicking outside
        var documentClickHandler = function(e) {
            var container = document.getElementById('emoji-picker-container');
            var trigger = document.getElementById('emoji-trigger-btn');
            if (container && !container.contains(e.target) && trigger && !trigger.contains(e.target)) {
                self.closeEmojiPicker();
            }
        };
        document.addEventListener('click', documentClickHandler);
        this._docClickHandler = documentClickHandler;

        // Subscribe to Firestore updates
        var currentUid = window.currentUid || (firebase.auth().currentUser ? firebase.auth().currentUser.uid : null);
        var currentRole = window.currentRole || 'apotek';

        this.messagesListener = db.collection('groupChat')
            .orderBy('createdAt', 'asc')
            .limitToLast(100)
            .onSnapshot(function(snapshot) {
                var area = document.getElementById('chat-messages-area');
                if (!area) return;

                if (snapshot.empty) {
                    area.innerHTML = [
                        '<div class="flex flex-col items-center justify-center py-20 text-center px-4">',
                        '  <div class="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-4 animate-bounce">',
                        '    <i data-lucide="message-circle" class="w-8 h-8"></i>',
                        '  </div>',
                        '  <h3 class="text-base font-bold text-slate-700 dark:text-slate-300">Belum ada diskusi</h3>',
                        '  <p class="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 leading-relaxed">Mulai obrolan baru dengan mengetikkan pesan di kolom input di bawah. Semua staf aktif akan melihat pesan Anda secara realtime!</p>',
                        '</div>'
                    ].join('');
                    if (window.lucide) lucide.createIcons({ el: area });
                    return;
                }

                var html = '';
                snapshot.forEach(function(doc) {
                    var msg = doc.data();
                    var docId = doc.id;
                    var isMe = msg.senderId === currentUid;
                    var formattedTime = self.formatTime(msg.createdAt);
                    var escapedMessage = Utils.escapeHtml(msg.message);
                    var roleBadge = self.getRoleBadge(msg.senderRole || 'staf');

                    // Delete button: allowed for sender themselves, or for Keuangan (Owner)
                    var deleteBtn = '';
                    if (isMe || currentRole === 'keuangan') {
                        deleteBtn = 
                            '<button onclick="AppChat.confirmDelete(\'' + docId + '\')" class="delete-msg-btn hidden group-hover:flex items-center justify-center p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition absolute top-2 ' + (isMe ? '-left-8' : '-right-8') + '" title="Hapus pesan">' +
                            '  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>' +
                            '</button>';
                    }

                    if (isMe) {
                        html += 
                            '<div class="flex flex-col items-end group relative mb-3">' +
                            '  <div class="flex items-center gap-1.5 mb-1 text-xs text-slate-400 dark:text-slate-500 select-none">' +
                            '    ' + roleBadge + '' +
                            '    <span class="font-semibold text-slate-600 dark:text-slate-300">' + Utils.escapeHtml(msg.senderName) + '</span>' +
                            '  </div>' +
                            '  <div class="relative max-w-[85%] md:max-w-[70%] flex items-start gap-1">' +
                            '    ' + deleteBtn + '' +
                            '    <div class="bg-primary-600 text-white rounded-2xl rounded-tr-none px-4 py-2.5 shadow-sm">' +
                            '      <p class="text-sm whitespace-pre-wrap break-words leading-relaxed">' + escapedMessage + '</p>' +
                            '      <div class="flex items-center justify-end gap-1 text-[9px] text-primary-200 mt-1 select-none leading-none">' +
                            '        <span>' + formattedTime + '</span>' +
                            '      </div>' +
                            '    </div>' +
                            '  </div>' +
                            '</div>';
                    } else {
                        html += 
                            '<div class="flex flex-col items-start group relative mb-3">' +
                            '  <div class="flex items-center gap-1.5 mb-1 text-xs text-slate-400 dark:text-slate-500 select-none">' +
                            '    <span class="font-semibold text-slate-700 dark:text-slate-300">' + Utils.escapeHtml(msg.senderName) + '</span>' +
                            '    ' + roleBadge + '' +
                            '  </div>' +
                            '  <div class="relative max-w-[85%] md:max-w-[70%] flex items-start gap-1">' +
                            '    <div class="bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-2xl rounded-tl-none px-4 py-2.5 shadow-sm border border-slate-100 dark:border-slate-600">' +
                            '      <p class="text-sm whitespace-pre-wrap break-words leading-relaxed">' + escapedMessage + '</p>' +
                            '      <div class="flex items-center justify-end gap-1 text-[9px] text-slate-400 dark:text-slate-400 mt-1 select-none leading-none">' +
                            '        <span>' + formattedTime + '</span>' +
                            '      </div>' +
                            '    </div>' +
                            '    ' + deleteBtn + '' +
                            '  </div>' +
                            '</div>';
                    }
                });

                area.innerHTML = html;
                if (window.lucide) lucide.createIcons({ el: area });
                
                // Scroll to bottom on updates
                self.scrollToBottom(true);
            }, function(err) {
                console.error('Error loading chat:', err);
                var area = document.getElementById('chat-messages-area');
                if (area) {
                    area.innerHTML = 
                        '<div class="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-center text-sm">' +
                        '  Gagal memuat pesan: ' + Utils.escapeHtml(err.message) +
                        '</div>';
                }
            });
    },

    sendMessage: function() {
        var self = this;
        var input = document.getElementById('chat-input');
        if (!input) return;
        
        var text = input.value.trim();
        if (!text) return;
        
        if (text.length > 1000) {
            Utils.toast('Pesan terlalu panjang (maksimal 1000 karakter)', 'warning');
            return;
        }
        
        var btn = document.getElementById('chat-send-btn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>';
        }
        input.disabled = true;
        
        var authUser = firebase.auth().currentUser;
        var senderId = window.currentUid || (authUser ? authUser.uid : null);
        if (!senderId) {
            Utils.toast('Sesi login tidak terdeteksi, silakan muat ulang halaman.', 'error');
            input.disabled = false;
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i data-lucide="send" class="w-5 h-5"></i>';
                if (window.lucide) lucide.createIcons({ el: btn });
            }
            return;
        }
        var senderName = window.currentUserName || 'Staf';
        var senderRole = window.currentRole || 'staf';
        
        db.collection('groupChat').add({
            senderId: senderId,
            senderName: senderName,
            senderRole: senderRole,
            message: text,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(function() {
            input.value = '';
            input.disabled = false;
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i data-lucide="send" class="w-5 h-5"></i>';
                if (window.lucide) lucide.createIcons({ el: btn });
            }
            input.style.height = '72px';
            input.focus();
            self.updateCharCount();
            self.scrollToBottom(true);
        }).catch(function(err) {
            console.error('Error sending message:', err);
            Utils.toast('Gagal mengirim pesan: ' + err.message, 'error');
            input.disabled = false;
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i data-lucide="send" class="w-5 h-5"></i>';
                if (window.lucide) lucide.createIcons({ el: btn });
            }
        });
    },

    updateCharCount: function() {
        var input = document.getElementById('chat-input');
        var counter = document.getElementById('char-counter');
        if (input && counter) {
            counter.textContent = input.value.length + '/1000';
        }
    },

    scrollToBottom: function(force) {
        var area = document.getElementById('chat-messages-area');
        if (!area) return;
        
        var isNearBottom = area.scrollHeight - area.scrollTop - area.clientHeight < 180;
        if (force || isNearBottom) {
            area.scrollTop = area.scrollHeight;
        }
    },

    formatTime: function(timestamp) {
        if (!timestamp) return '';
        var date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        var today = new Date();
        var isToday = date.toDateString() === today.toDateString();
        
        var hours = date.getHours().toString().padStart(2, '0');
        var minutes = date.getMinutes().toString().padStart(2, '0');
        var timeStr = hours + ':' + minutes;
        
        if (isToday) {
            return 'Hari ini, ' + timeStr;
        }
        
        var yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        var isYesterday = date.toDateString() === yesterday.toDateString();
        if (isYesterday) {
            return 'Kemarin, ' + timeStr;
        }
        
        var options = { day: 'numeric', month: 'short' };
        return date.toLocaleDateString('id-ID', options) + ', ' + timeStr;
    },

    getRoleBadge: function(role) {
        var label = role.charAt(0).toUpperCase() + role.slice(1);
        var classes = '';
        if (role === 'keuangan') {
            label = 'Owner / Keuangan';
            classes = 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20';
        } else if (role === 'admin') {
            label = 'Admin';
            classes = 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20';
        } else if (role === 'dokter') {
            label = 'Dokter';
            classes = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20';
        } else if (role === 'klinik') {
            label = 'Klinik';
            classes = 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20';
        } else if (role === 'apotek') {
            label = 'Apotek';
            classes = 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20';
        } else {
            classes = 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border border-slate-500/20';
        }
        return '<span class="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ' + classes + '">' + label + '</span>';
    },

    confirmDelete: function(docId) {
        var modalContent = 
            '<div class="p-6 text-center">' +
            '  <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 mb-4">' +
            '    <i data-lucide="trash-2" class="w-6 h-6"></i>' +
            '  </div>' +
            '  <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-2">Hapus Pesan</h3>' +
            '  <p class="text-sm text-slate-500 dark:text-slate-400 mb-6 font-medium">Apakah Anda yakin ingin menghapus pesan ini dari forum diskusi?</p>' +
            '  <div class="flex justify-center gap-3">' +
            '    <button onclick="Utils.closeModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-lg transition">' +
            '      Batal' +
            '      </button>' +
            '    <button id="btn-delete-confirm" onclick="AppChat.deleteMessage(\'' + docId + '\')" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition flex items-center gap-2">' +
            '      Ya, Hapus' +
            '    </button>' +
            '  </div>' +
            '</div>';
        Utils.openModal(modalContent);
        if (window.lucide) lucide.createIcons();
    },

    deleteMessage: function(docId) {
        var btn = document.getElementById('btn-delete-confirm');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>';
        }
        
        db.collection('groupChat').doc(docId).delete()
            .then(function() {
                Utils.closeModal();
                Utils.toast('Pesan berhasil dihapus.', 'success');
            })
            .catch(function(err) {
                console.error('Error deleting message:', err);
                Utils.toast('Gagal menghapus pesan: ' + err.message, 'error');
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = 'Ya, Hapus';
                }
            });
    },

    toggleEmojiPicker: function(e) {
        if (e) {
            e.stopPropagation();
        }
        var container = document.getElementById('emoji-picker-container');
        if (!container) return;
        
        var isHidden = container.classList.contains('hidden');
        if (isHidden) {
            container.classList.remove('hidden');
            var trigger = document.getElementById('emoji-trigger-btn');
            if (trigger) {
                trigger.classList.add('text-primary-500');
            }
        } else {
            this.closeEmojiPicker();
        }
    },

    closeEmojiPicker: function() {
        var container = document.getElementById('emoji-picker-container');
        if (container) {
            container.classList.add('hidden');
        }
        var trigger = document.getElementById('emoji-trigger-btn');
        if (trigger) {
            trigger.classList.remove('text-primary-500');
        }
    },

    insertEmoji: function(emoji) {
        var input = document.getElementById('chat-input');
        if (!input) return;
        
        var start = input.selectionStart;
        var end = input.selectionEnd;
        var text = input.value;
        
        var newText = text.substring(0, start) + emoji + text.substring(end);
        input.value = newText;
        
        // Put focus back and set cursor position after the emoji
        input.focus();
        var newCursorPos = start + emoji.length;
        input.setSelectionRange(newCursorPos, newCursorPos);
        
        // Trigger auto-resize input height
        input.style.height = 'auto';
        var newH = Math.max(input.scrollHeight, 72);
        input.style.height = newH + 'px';
        if (parseInt(input.style.height) > 256) {
            input.style.height = '256px';
        }
        
        this.updateCharCount();
    },

    renderEmojiPickerHtml: function() {
        var html = [
            '<div class="px-3 py-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between select-none">',
            '  <span class="text-xs font-bold text-slate-700 dark:text-slate-300">Pilih Emoji</span>',
            '  <button onclick="AppChat.closeEmojiPicker()" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">',
            '    <i data-lucide="x" class="w-3.5 h-3.5"></i>',
            '  </button>',
            '</div>',
            '<div class="p-3 max-h-60 overflow-y-auto space-y-3 scrollbar-thin">'
        ];

        var categories = [
            {
                name: 'Wajah &amp; Ekspresi',
                emojis: ['😊', '😂', '🥰', '😍', '😎', '🤔', '😅', '😮', '😢', '😡', '🥳', '😴', '🤢', '😱']
            },
            {
                name: 'Isyarat &amp; Tangan',
                emojis: ['👍', '👎', '👏', '🙌', '🙏', '💪', '👋', '🤝', '✌️', '👊']
            },
            {
                name: 'Umum &amp; Simbol',
                emojis: ['🎉', '🔥', '❤️', '✨', '💡', '📝', '🚀', '💬', '📌', '⏰', '✅', '❌', '❓', '💻', '🏥', '💊', '🩺', '💵']
            }
        ];

        categories.forEach(function(cat) {
            html.push('  <div>');
            html.push('    <div class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 select-none">' + cat.name + '</div>');
            html.push('    <div class="grid grid-cols-7 gap-1">');
            cat.emojis.forEach(function(emoji) {
                html.push('      <button onclick="AppChat.insertEmoji(\'' + emoji + '\')" class="h-8 w-8 flex items-center justify-center text-lg rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition active:scale-90" title="' + emoji + '">' + emoji + '</button>');
            });
            html.push('    </div>');
            html.push('  </div>');
        });

        html.push('</div>');
        return html.join('');
    }
};
