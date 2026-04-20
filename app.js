// Импорт функций Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// --- КОНФИГУРАЦИЯ FIREBASE ---
// ЗАМЕНИТЕ ЭТОТ ОБЪЕКТ НА ДАННЫЕ ИЗ ВАШЕЙ КОНСОЛИ FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyAvjmo78uTKkCY96uzTiT4boDeCVoEJhOk",
  authDomain: "epsilonbase-316d2.firebaseapp.com",
  projectId: "epsilonbase-316d2",
  storageBucket: "epsilonbase-316d2.firebasestorage.app",
  messagingSenderId: "230539197818",
  appId: "1:230539197818:web:7ddae53c499b318f6caac3"
};

// Инициализация
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Элементы DOM
const authForms = document.getElementById('auth-forms');
const mainContent = document.getElementById('main-content');
const logoutBtn = document.getElementById('logout-btn');
const videosContainer = document.getElementById('videos-container');

// Переключение форм
document.getElementById('show-register').addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelector('.form-box').style.display = 'none';
    document.getElementById('register-box').style.display = 'block';
});

document.getElementById('show-login').addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelector('.form-box').style.display = 'block';
    document.getElementById('register-box').style.display = 'none';
});

// --- АУТЕНТИФИКАЦИЯ ---

// Регистрация
document.getElementById('register-btn').addEventListener('click', async () => {
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    try {
        await createUserWithEmailAndPassword(auth, email, password);
        alert("Регистрация успешна!");
    } catch (error) {
        alert("Ошибка регистрации: " + error.message);
    }
});

// Вход
document.getElementById('login-btn').addEventListener('click', async () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        alert("Ошибка входа: " + error.message);
    }
});

// Выход
logoutBtn.addEventListener('click', () => {
    signOut(auth);
});

// Отслеживание состояния пользователя
onAuthStateChanged(auth, (user) => {
    if (user) {
        authForms.style.display = 'none';
        mainContent.style.display = 'block';
        logoutBtn.style.display = 'block';
        loadVideos(); // Загружаем видео при входе
    } else {
        authForms.style.display = 'flex';
        mainContent.style.display = 'none';
        logoutBtn.style.display = 'none';
    }
});

// --- РАБОТА С ВИДЕО ---

// Функция преобразования ссылок в пригодные для embed/src
function processVideoUrl(url, type) {
    if (type === 'drive') {
        // Преобразует ссылку Google Drive в прямую ссылку для просмотра
        // Пример входной ссылки: https://drive.google.com/file/d/FILE_ID/view
        const idMatch = url.match(/\/d\/(.+)\/view/);
        if (idMatch && idMatch[1]) {
            return `https://drive.google.com/uc?export=download&id=${idMatch[1]}`;
            // Примечание: Для больших файлов Google может блокировать автоматическое воспроизведение.
            // Альтернатива для iframe: https://drive.google.com/file/d/FILE_ID/preview
        }
    } else if (type === 'dropbox') {
        // Dropbox требует параметр dl=1 для прямой отдачи файла
        if (url.includes('dropbox.com')) {
            return url.replace('?dl=0', '?dl=1');
        }
    }
    return url; // Возвращаем как есть для прямых ссылок
}

// Добавление видео
document.getElementById('add-video-btn').addEventListener('click', async () => {
    const title = document.getElementById('video-title').value;
    const url = document.getElementById('video-url').value;
    const sourceType = document.getElementById('video-source').value;

    if (!title || !url) {
        alert("Заполните все поля");
        return;
    }

    const processedUrl = processVideoUrl(url, sourceType);

    try {
        await addDoc(collection(db, "videos"), {
            title: title,
            url: processedUrl,
            createdAt: new Date(),
            userId: auth.currentUser.uid
        });
        // Очистка полей
        document.getElementById('video-title').value = '';
        document.getElementById('video-url').value = '';
    } catch (error) {
        console.error("Ошибка добавления: ", error);
        alert("Не удалось добавить видео.");
    }
});

// Загрузка и отображение видео (Real-time)
function loadVideos() {
    const q = query(collection(db, "videos"), orderBy("createdAt", "desc"));
    
    onSnapshot(q, (snapshot) => {
        videosContainer.innerHTML = ''; // Очищаем контейнер
        snapshot.forEach((doc) => {
            const video = doc.data();
            const videoCard = document.createElement('div');
            videoCard.className = 'video-card';

            // Определяем тип плеера. 
            // Для Google Drive лучше использовать iframe preview, для прямых ссылок - video tag.
            let playerHtml = '';
            
            if (video.url.includes('drive.google.com')) {
                 // Используем iframe для Google Drive для надежности
                 const driveIdMatch = video.url.match(/id=([^&]+)/);
                 if(driveIdMatch) {
                     playerHtml = `<iframe src="https://drive.google.com/file/d/${driveIdMatch[1]}/preview" width="100%" height="200" allow="autoplay"></iframe>`;
                 } else {
                     playerHtml = `<p style="padding:10px">Ошибка формата ссылки Google Drive</p>`;
                 }
            } else {
                // Стандартный HTML5 видео плеер
                playerHtml = `<video controls class="video-player" src="${video.url}"></video>`;
            }

            videoCard.innerHTML = `
                ${playerHtml}
                <div class="video-info">
                    <h3>${video.title}</h3>
                </div>
            `;
            videosContainer.appendChild(videoCard);
        });
    });
}
