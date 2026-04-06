(function () {
    // ---------- НАСТРОЙКИ ----------
    const GRID_SIZE = 4;          // 4x4 пазл
    const TOTAL_PIECES = GRID_SIZE * GRID_SIZE;   // 16
    const EMPTY_INDEX = TOTAL_PIECES - 1;   // последний кусочек (15) будет пустышкой (белый)
    const IMAGE_PATH = 'image.jpg';  // путь к картинке пазла (положи image.jpg в корень проекта)

    // Глобальные переменные
    let board = [];           // одномерный массив, хранит текущие индексы "кусочков" (0..15)
    let moveCount = 0;
    let gameWin = false;
    let gameTime = 0;         // время игры в секундах
    let gameTimer = null;     // интервал таймера

    const RECORDS_KEY = "pazl_records";
    const PRIZES_KEY = "pazl_prizes";

    // работа с localStorage — рекорды
    function getRecords() {
        try {
            const data = JSON.parse(localStorage.getItem(RECORDS_KEY));
            if (Array.isArray(data) && data.length > 0) return data;
        } catch (e) { /* ignore */ }
        return [];
    }

    function saveRecords(records) {
        localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
    }

    function getBestRecord() {
        const records = getRecords();
        if (records.length === 0) return null;
        return Math.min(...records.map(r => r.time));
    }

    function addRecord(time, moves) {
        const records = getRecords();
        records.push({ time, moves, date: new Date().toISOString() });
        // сортируем по времени (лучшие первые)
        records.sort((a, b) => a.time - b.time);
        // храним топ-10
        if (records.length > 10) records.length = 10;
        saveRecords(records);
    }

    // работа с localStorage — призы
    function getPrizes() {
        try {
            const data = JSON.parse(localStorage.getItem(PRIZES_KEY));
            if (Array.isArray(data)) return data;
        } catch (e) { /* ignore */ }
        return [];
    }

    function savePrizes(prizes) {
        localStorage.setItem(PRIZES_KEY, JSON.stringify(prizes));
    }

    function addPrize(prizeName, time, moves) {
        const prizes = getPrizes();
        prizes.push({ name: prizeName, time, moves, date: new Date().toISOString(), claimed: false });
        savePrizes(prizes);
    }

    // DOM элементы
    const gridContainer = document.getElementById("puzzleGrid");
    const moveCounterSpan = document.getElementById("moveCounter");
    const gameTimerSpan = document.getElementById("gameTimer");
    const shuffleBtn = document.getElementById("shuffleBtn");
    const helpBtn = document.getElementById("helpBtn");
    const helpOverlay = document.getElementById("helpOverlay");
    const closeHelpBtn = document.getElementById("closeHelpBtn");
    const winOverlay = document.getElementById("winOverlay");
    const finalMovesSpan = document.getElementById("finalMoves");
    const finalTimeSpan = document.getElementById("finalTime");
    const confirmPrizeBtn = document.getElementById("confirmPrizeBtn");
    const playAgainBtn = document.getElementById("playAgainBtn");
    const prizeOptions = document.querySelector(".prize-options");
    const prizeChocolate = document.getElementById("prizeChocolate");
    const prizeMoney = document.getElementById("prizeMoney");

    // создаём элемент отображения рекорда в шапке
    const headerContainer = document.querySelector(".puzzle-header");
    const recordPanel = document.createElement("div");
    recordPanel.className = "info-panel record-panel";
    recordPanel.innerHTML = '<i class="fa-solid fa-crown"></i> <span class="label-text">Рекорд:</span> <span id="bestRecord">--:--</span>';
    // вставляем после info-time
    const infoTimePanel = document.querySelector(".info-time");
    if (infoTimePanel && headerContainer) {
        headerContainer.insertBefore(recordPanel, infoTimePanel.nextSibling);
    }

    function updateBestRecordDisplay() {
        const bestEl = document.getElementById("bestRecord");
        if (bestEl) {
            const best = getBestRecord();
            bestEl.innerText = best ? formatTime(best) : "--:--";
        }
    }

    // создаём элемент уведомления
    const copyNotification = document.createElement("div");
    copyNotification.className = "copy-notification";
    copyNotification.innerHTML = '<i class="fa-solid fa-clipboard-check"></i> <span></span>';
    document.body.appendChild(copyNotification);

    // функция показа уведомления
    function showCopyNotification(message) {
        copyNotification.querySelector("span").innerText = message;
        copyNotification.classList.add("show");
        setTimeout(() => {
            copyNotification.classList.remove("show");
        }, 3500);
    }

    // форматирование времени
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }

    // запуск таймера
    function startTimer() {
        stopTimer();
        gameTime = 0;
        if (gameTimerSpan) gameTimerSpan.innerText = "00:00";
        gameTimer = setInterval(() => {
            gameTime++;
            if (gameTimerSpan) gameTimerSpan.innerText = formatTime(gameTime);
        }, 1000);
    }

    // остановка таймера
    function stopTimer() {
        if (gameTimer) {
            clearInterval(gameTimer);
            gameTimer = null;
        }
    }

    // ---------- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ----------
    // преобразуем индекс строки/столбца в позицию фона для CSS (background-position)
    // background-size: 400% 400%  (4 колонки, 4 строки)
    function getBackgroundPosition(pieceIdx) {
        // pieceIdx - логический номер картинки от 0 до 15 (какой кусок должен быть на месте)
        const row = Math.floor(pieceIdx / GRID_SIZE);
        const col = pieceIdx % GRID_SIZE;
        // проценты для background-position: горизонталь = col * (100% / (кол-во - 1))? но т.к. size 400%,
        // то каждый кусок занимает ровно 1/4 = 25% от контейнера. Поэтому позиция = col * 100% / (GRID_SIZE-1)? 
        // Правильно: при background-size: 400% 400% (ширина 400% от элемента, значит каждый tile занимает ровно 25% от родителя).
        // Чтобы показать нужную часть картинки: background-position: -col*100% , -row*100%  (в процентах от размера элемента)
        // Так как каждый tile видит 25% от общей картинки. Но offset считается относительно самого элемента.
        // Стандартный способ: background-position: calc(col * 100% / (GRID_SIZE - 1)) ? НЕТ проще: 
        // Если background-size: 400% 400%, то для отображения фрагмента в ячейке (row, col) нужно задать:
        // background-position: (col * -100%) (row * -100%)? Проверим: при col=0 позиция 0% 0% показывает верхний левый угол большой картинки.
        // Но из-за того, что размер элемента 25% от родителя, а фон растянут в 4 раза, то смещение должно быть: col * 100% по горизонтали, row * 100% по вертикали.
        // Пример: col=1 => показываем кусок, который начинается с 25% от левого края общей картинки => background-position: -100%? Нет:
        // Если background-size: 400%, то фон шире в 4 раза. Для показа 2-го столбца нужно сместить фон влево на 100% от ширины ячейки => background-position-x: -100%.
        // Аналогично для строк. Итог: background-position: (col * -100%) (row * -100%)
        const xPos = col * -100;
        const yPos = row * -100;
        return `${xPos}% ${yPos}%`;
    }

    // Генерирует стиль для ячейки: фоновая картинка и позиция в зависимости от того, какой кусочек (логический номер) должен быть отображен.
    // Если logicalPieceId === EMPTY_INDEX (15) -> пустая заглушка (белый фон с текстурой)
    function getPieceStyle(logicalPieceId) {
        if (logicalPieceId === EMPTY_INDEX) {
            // пустая ячейка — можно сделать приятный светло-серый фон, имитация пустого места
            return `background-image: none; background-color: #1a1a24; background-size: cover; box-shadow: inset 0 0 0 2px rgba(167, 139, 250, 0.15);`;
        } else {
            // нормальный кусочек картинки
            // background-image берется из глобального стиля, зададим динамически через url
            const bgPos = getBackgroundPosition(logicalPieceId);
            return `background-image: url('${IMAGE_PATH}'); background-position: ${bgPos}; background-size: 400% 400%; background-repeat: no-repeat; background-color: #1e1e2a;`;
        }
    }

    // отрисовать сетку полностью по текущему board (board хранит, какой кусок находится в каждой ячейке)
    function renderBoard() {
        if (!gridContainer) return;
        gridContainer.innerHTML = "";
        // предотвращаем прокрутку/масштабирование на сетке для мобильных
        gridContainer.addEventListener("touchmove", function(e) {
            e.preventDefault();
        }, { passive: false });
        for (let i = 0; i < TOTAL_PIECES; i++) {
            const pieceLogicalId = board[i];    // логический ID кусочка (0..15) который лежит в позиции i
            const pieceDiv = document.createElement("div");
            pieceDiv.className = "puzzle-piece";
            // применяем стиль в зависимости от того, что это за кусочек
            pieceDiv.style.cssText = getPieceStyle(pieceLogicalId);
            // добавляем data-index для обработки клика (текущая позиция)
            pieceDiv.setAttribute("data-pos", i);
            // поддержка и click, и touch событий для мобильных
            pieceDiv.addEventListener("click", (function (pos) {
                return function () { onPieceClick(pos); };
            })(i));
            pieceDiv.addEventListener("touchend", function(e) {
                e.preventDefault();
                onPieceClick(i);
            });
            gridContainer.appendChild(pieceDiv);
        }
    }

    // плавное перемещение двух плиток (clickedPos <-> emptyPos) без полной перерисовки
    function animateSwap(clickedPos, emptyPos, callback) {
        const pieces = gridContainer.querySelectorAll('.puzzle-piece');
        const clickedPiece = pieces[clickedPos];
        const emptyPiece = pieces[emptyPos];
        if (!clickedPiece || !emptyPiece) {
            renderBoard();
            callback();
            return;
        }

        const clickedRect = clickedPiece.getBoundingClientRect();
        const emptyRect = emptyPiece.getBoundingClientRect();

        const dx = emptyRect.left - clickedRect.left;
        const dy = emptyRect.top - clickedRect.top;

        // задаём начальные позиции через relative offset
        clickedPiece.style.position = 'relative';
        clickedPiece.style.transition = 'none';
        clickedPiece.style.left = '0px';
        clickedPiece.style.top = '0px';
        emptyPiece.style.transition = 'none';

        // принудительный reflow
        clickedPiece.offsetHeight;

        // анимируем
        clickedPiece.style.transition = 'left 0.12s cubic-bezier(0.25, 0.46, 0.45, 0.94), top 0.12s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        clickedPiece.style.left = dx + 'px';
        clickedPiece.style.top = dy + 'px';
        clickedPiece.style.zIndex = '10';
        emptyPiece.style.opacity = '0.25';
        emptyPiece.style.transform = 'scale(0.85)';

        setTimeout(function() {
            // меняем данные в массиве
            [board[clickedPos], board[emptyPos]] = [board[emptyPos], board[clickedPos]];
            // мгновенно перерисовываем — теперь элементы уже на своих местах
            renderBoard();
            callback();
        }, 130);
    }

    // проверка победы: каждый элемент board[i] должен быть равен i (кусок на своём месте)
    function checkWin() {
        if (gameWin) return true;
        for (let i = 0; i < TOTAL_PIECES; i++) {
            if (board[i] !== i) return false;
        }
        // победа!
        gameWin = true;
        stopTimer();
        finalMovesSpan.innerText = moveCount;
        finalTimeSpan.innerText = formatTime(gameTime);

        // сначала вычисляем старые рекорды, потом сохраняем новый
        const oldBest = getBestRecord();
        const isFirstGame = oldBest === null;
        const prevBest = !isFirstGame
            ? Math.min(...getRecords().map(r => r.time))
            : null;

        // сохраняем результат
        addRecord(gameTime, moveCount);

        // проверяем, побит ли рекорд
        let recordInfoEl = document.getElementById("recordInfo");
        if (!recordInfoEl) {
            recordInfoEl = document.createElement("p");
            recordInfoEl.id = "recordInfo";
            recordInfoEl.className = "record-info";
            const winCard = winOverlay.querySelector(".win-card");
            const finalTimeEl = document.getElementById("finalTime");
            if (finalTimeEl && finalTimeEl.parentElement) {
                const resultP = finalTimeEl.closest("p");
                if (resultP) {
                    resultP.insertAdjacentElement("afterend", recordInfoEl);
                } else {
                    winCard.appendChild(recordInfoEl);
                }
            } else {
                winCard.appendChild(recordInfoEl);
            }
        }

        const isBestEver = isFirstGame || gameTime <= oldBest;
        const prizeTitle = document.querySelector(".prize-title");

        if (isBestEver) {
            if (isFirstGame) {
                recordInfoEl.innerHTML = `<strong>Первый рекорд!</strong>`;
            } else {
                const diff = prevBest !== null ? prevBest - gameTime : null;
                recordInfoEl.innerHTML = `<strong>Новый рекорд!</strong>` +
                    (diff && diff > 0 ? ` — лучше предыдущего на <strong>${formatTime(diff)}</strong>!` : "");
            }
            recordInfoEl.style.color = "#facc15";

            // автоматически даём приз за рекорд
            addPrize("Рекорд!", gameTime, moveCount);

            if (prizeTitle) prizeTitle.innerText = "Выбери свой приз!";
            if (prizeOptions) prizeOptions.style.display = "flex";
            if (confirmPrizeBtn) confirmPrizeBtn.style.display = "block";
            if (playAgainBtn) playAgainBtn.style.display = "block";
        } else {
            const diff = gameTime - oldBest;
            recordInfoEl.innerHTML = `До рекорда <strong>${formatTime(oldBest)}</strong> осталось <strong>${formatTime(diff)}</strong>. Попробуй ещё раз!`;
            recordInfoEl.style.color = "";
            if (prizeTitle) prizeTitle.innerText = "Чтобы выбрать приз, нужно побить рекорд!";
            if (prizeOptions) prizeOptions.style.display = "none";
            if (confirmPrizeBtn) confirmPrizeBtn.style.display = "none";
            if (playAgainBtn) playAgainBtn.style.display = "block";
        }

        winOverlay.classList.add("show");
        return true;
    }

    // попытка перемещения: если соседняя с пустотой (EMPTY_INDEX) ячейка кликнута, меняем местами
    function tryMove(clickedPos) {
        if (gameWin) return false;

        // ищем позицию, где находится пустой кусочек (EMPTY_INDEX)
        let emptyPos = -1;
        for (let i = 0; i < TOTAL_PIECES; i++) {
            if (board[i] === EMPTY_INDEX) {
                emptyPos = i;
                break;
            }
        }
        if (emptyPos === -1) return false;

        // проверяем, являются ли clickedPos и emptyPos соседями
        const clickedRow = Math.floor(clickedPos / GRID_SIZE);
        const clickedCol = clickedPos % GRID_SIZE;
        const emptyRow = Math.floor(emptyPos / GRID_SIZE);
        const emptyCol = emptyPos % GRID_SIZE;

        const isAdjacent = (Math.abs(clickedRow - emptyRow) + Math.abs(clickedCol - emptyCol)) === 1;
        if (!isAdjacent) return false;

        // анимируем перемещение
        animateSwap(clickedPos, emptyPos, function() {
            moveCount++;
            moveCounterSpan.innerText = moveCount;
            checkWin();
        });
        return true;
    }

    function onPieceClick(position) {
        if (gameWin) return;
        tryMove(position);
    }

    // ---- Перемешивание (случайные перестановки, но обязательно решаемое) ----
    // Выполняем N случайных перемещений из пустой клетки для создания случайной, но решаемой конфигурации
    function shuffleBoard(iterations = 280) {
        // сбросим доску до решённого состояния
        resetToSolved();
        // найдём пустую клетку (индекс EMPTY_INDEX)
        let emptyPos = getEmptyPosition();

        // делаем много случайных допустимых ходов
        for (let step = 0; step < iterations; step++) {
            const neighbors = getAdjacentPositions(emptyPos);
            if (neighbors.length === 0) continue;
            const randomNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
            // меняем местами пустую и соседа
            [board[emptyPos], board[randomNeighbor]] = [board[randomNeighbor], board[emptyPos]];
            emptyPos = randomNeighbor; // пустышка переместилась
        }
        // после перемешивания обновляем счётчик ходов в 0 (новая игра)
        moveCount = 0;
        moveCounterSpan.innerText = moveCount;
        gameWin = false;
        startTimer();
        renderBoard();
        // скрываем окно победы если было
        winOverlay.classList.remove("show");
    }

    // получить список соседних индексов для позиции pos
    function getAdjacentPositions(pos) {
        const row = Math.floor(pos / GRID_SIZE);
        const col = pos % GRID_SIZE;
        const neighbors = [];
        if (row > 0) neighbors.push(pos - GRID_SIZE);
        if (row < GRID_SIZE - 1) neighbors.push(pos + GRID_SIZE);
        if (col > 0) neighbors.push(pos - 1);
        if (col < GRID_SIZE - 1) neighbors.push(pos + 1);
        return neighbors;
    }

    function getEmptyPosition() {
        for (let i = 0; i < TOTAL_PIECES; i++) {
            if (board[i] === EMPTY_INDEX) return i;
        }
        return -1;
    }

    // сброс до идеального порядка (победа)
    function resetToSolved() {
        for (let i = 0; i < TOTAL_PIECES; i++) {
            board[i] = i;
        }
        moveCount = 0;
        moveCounterSpan.innerText = moveCount;
        gameWin = false;
        stopTimer();
        renderBoard();
        winOverlay.classList.remove("show");
    }

    // Новая игра с перемешиванием (и обнуление ходов)
    function newGame() {
        // скрываем кнопку "Играть дальше" до следующего завершения
        if (playAgainBtn) playAgainBtn.style.display = "none";
        updateBestRecordDisplay();
        shuffleBoard(320); // достаточно ходов для хорошего перемешивания
    }

    // функция проверки загрузки картинки
    function preloadImageAndStart() {
        const img = new Image();
        img.onload = function () {
            console.log("Картинка загружена, пазл готов");
            bindEvents();
            initGame();
        };
        img.onerror = function () {
            console.warn("Картинка image.jpg не найдена. Игра запущен в режиме цветных плиток.");
            bindEvents();
            initGameWithFallback();
        };
        img.src = IMAGE_PATH;
    }

    // нормальная инициализация с картинкой (функция getPieceStyle уже использует url)
    function initGame() {
        board = new Array(TOTAL_PIECES);
        resetToSolved();    // сначала собранное состояние
        moveCount = 0;
        gameWin = false;
        moveCounterSpan.innerText = "0";
        updateBestRecordDisplay();
        // потом перемешаем один раз при старте
        shuffleBoard(280);
    }

    // фолбэк если картинка не найдена — добавим цветные блоки и покажем текст, чтобы игра не ломалась
    function initGameWithFallback() {
        // переопределим getPieceStyle для фолбэка (цветные блоки)
        window.getPieceStyle = function (logicalPieceId) {
            if (logicalPieceId === EMPTY_INDEX) {
                return `background-color: #b0a07c; background-image: none; box-shadow: inset 0 0 0 2px #e7cf93;`;
            } else {
                // цветовая схема на основе индекса
                const hue = (logicalPieceId * 23) % 360;
                return `background-color: hsl(${hue}, 65%, 65%); background-image: none; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: bold; color: white; text-shadow: 1px 1px 0 black; content: "${logicalPieceId + 1}";`;
            }
        };
        // также нужно переопределить рендер, чтобы добавить текст в случае фолбэка. В оригинале getPieceStyle не добавляет текст, но мы можем добавить текстовую метку
        // сделаем хак: после рендера добавим текст в каждый блок, который не пустой
        const originalRender = renderBoard;
        window.renderBoard = function () {
            originalRender();
            if (!window.isFallbackMode) {
                window.isFallbackMode = true;
            }
            const pieces = document.querySelectorAll('.puzzle-piece');
            for (let i = 0; i < pieces.length; i++) {
                const logicalId = board[i];
                if (logicalId !== EMPTY_INDEX && pieces[i]) {
                    pieces[i].style.display = 'flex';
                    pieces[i].style.alignItems = 'center';
                    pieces[i].style.justifyContent = 'center';
                    pieces[i].style.fontSize = '1.6rem';
                    pieces[i].style.fontWeight = 'bold';
                    pieces[i].style.color = '#1f2c1b';
                    pieces[i].innerText = (logicalId + 1).toString();
                } else if (logicalId === EMPTY_INDEX && pieces[i]) {
                    pieces[i].innerText = '';
                    pieces[i].style.display = 'flex';
                }
            }
        };
        // заменяем функции, чтобы рендер использовал новый getPieceStyle
        const originalGetPieceStyle = window.getPieceStyle;
        // принудительно переопределим getPieceStyle в глобальном доступе
        window.getPieceStyle = function (logicalPieceId) {
            if (logicalPieceId === EMPTY_INDEX) {
                return `background-color: #1a1a24; background-image: none; box-shadow: inset 0 0 0 2px rgba(167, 139, 250, 0.15); display: flex; align-items: center; justify-content: center;`;
            } else {
                const hue = (logicalPieceId * 23) % 360;
                return `background-color: hsl(${hue}, 60%, 45%); background-image: none; display: flex; align-items: center; justify-content: center; font-size: 1.6rem; font-weight: bold; color: #e4e4e7; text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);`;
            }
        };
        // сохраняем ссылку на старый рендер, переопределим его
        renderBoard = function () {
            if (!gridContainer) return;
            gridContainer.innerHTML = "";
            for (let i = 0; i < TOTAL_PIECES; i++) {
                const pieceLogicalId = board[i];
                const pieceDiv = document.createElement("div");
                pieceDiv.className = "puzzle-piece";
                pieceDiv.style.cssText = window.getPieceStyle(pieceLogicalId);
                if (pieceLogicalId !== EMPTY_INDEX) {
                    pieceDiv.innerText = (pieceLogicalId + 1).toString();
                } else {
                    pieceDiv.innerText = "";
                }
                pieceDiv.setAttribute("data-pos", i);
                // поддержка и click, и touch событий для мобильных
                pieceDiv.addEventListener("click", (function (pos) {
                    return function () { onPieceClick(pos); };
                })(i));
                pieceDiv.addEventListener("touchend", function(e) {
                    e.preventDefault();
                    onPieceClick(i);
                });
                gridContainer.appendChild(pieceDiv);
            }
        };
        // инициализируем доску
        board = new Array(TOTAL_PIECES);
        resetToSolved();
        moveCount = 0;
        gameWin = false;
        moveCounterSpan.innerText = "0";
        shuffleBoard(280);
    }

    // привязываем кнопки
    function bindEvents() {
        // добавляем обработчики и для click, и для touch событий
        function addButtonListener(element, callback) {
            element.addEventListener("click", callback);
            element.addEventListener("touchend", function(e) {
                e.preventDefault();
                callback();
            });
        }

        addButtonListener(shuffleBtn, () => {
            if (gameWin) winOverlay.classList.remove("show");
            newGame();
        });
        addButtonListener(helpBtn, () => {
            helpOverlay.classList.add("show");
        });
        addButtonListener(closeHelpBtn, () => {
            helpOverlay.classList.remove("show");
        });
        // закрытие по клику на оверлей
        helpOverlay.addEventListener("click", (e) => {
            if (e.target === helpOverlay) {
                helpOverlay.classList.remove("show");
            }
        });
        // закрытие по Escape
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                helpOverlay.classList.remove("show");
            }
        });

        // подтверждение выбора приза и копирование в буфер
        addButtonListener(confirmPrizeBtn, () => {
            const selectedPrize = prizeChocolate.classList.contains("selected") ? prizeChocolate :
                                  prizeMoney.classList.contains("selected") ? prizeMoney : null;

            if (!selectedPrize) {
                showCopyNotification("⚠️ Сначала выбери приз!");
                return;
            }

            const prizeLabel = selectedPrize.querySelector(".prize-label").innerText;
            const moves = finalMovesSpan.innerText;
            const time = finalTimeSpan.innerText;

            // помечаем последний непризнанный приз как полученный
            const prizes = getPrizes();
            for (let i = 0; i < prizes.length; i++) {
                if (!prizes[i].claimed) {
                    prizes[i].claimed = true;
                    prizes[i].chosenPrize = prizeLabel;
                    break;
                }
            }
            savePrizes(prizes);

            // формируем полное сообщение для копирования
            const copyMessage = `🏆 Победа в пазле!\n🎁 Приз: ${prizeLabel}\n🔢 Ходов: ${moves}\n⏱️ Время: ${time}`;

            // создаём временный textarea для копирования
            const textarea = document.createElement("textarea");
            textarea.value = copyMessage;
            textarea.style.position = "fixed";
            textarea.style.left = "-9999px";
            textarea.style.top = "-9999px";
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();

            let copied = false;
            try {
                copied = document.execCommand("copy");
            } catch (err) {
                copied = false;
            }

            document.body.removeChild(textarea);

            if (copied) {
                showCopyNotification("✅ Скопировано: " + prizeLabel);
            } else {
                // пробуем через clipboard API
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(copyMessage).then(() => {
                        showCopyNotification("✅ Скопировано: " + prizeLabel);
                    }).catch(() => {
                        showCopyNotification("❌ Не удалось скопировать");
                    });
                } else {
                    // показываем текст для ручного копирования
                    showCopyNotification("📋 Текст: " + copyMessage);
                }
            }
        });

        // обработка выбора приза
        function selectPrize(card) {
            // убираем выделение с обоих карточек
            prizeChocolate.classList.remove("selected");
            prizeMoney.classList.remove("selected");
            // выделяем выбранную
            card.classList.add("selected");
        }

        addButtonListener(prizeChocolate, () => {
            selectPrize(prizeChocolate);
        });
        addButtonListener(prizeMoney, () => {
            selectPrize(prizeMoney);
        });

        // кнопка "Играть дальше"
        addButtonListener(playAgainBtn, () => {
            winOverlay.classList.remove("show");
            newGame();
        });
    }

    // Старт игры с проверкой картинки
    preloadImageAndStart();
})();