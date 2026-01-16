window.onload = function () {

  // Define suits and values
  const SUITS = [
    { name: "heart", symbol: "♥", color: "red" },
    { name: "diamond", symbol: "♦", color: "red" },
    { name: "spade", symbol: "♠", color: "black" },
    { name: "club", symbol: "♣", color: "black" }
  ];

  const VALUES = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

  function getValueNumber(value) {
    const map = { A: 1, J: 11, Q: 12, K: 13 };
    return map[value] || parseInt(value);
  }

  // Shuffle 
  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  // Create a standard deck of 52 cards
  function createDeck() {
    const deck = [];
    SUITS.forEach(suit => {
      VALUES.forEach(value => {
        deck.push({
          suit: suit.name,
          symbol: suit.symbol,
          color: suit.color,
          value
        });
      });
    });
    return deck;
  }

  // Check for win condition
  function checkWin() {
    const total = Object.values(foundations)
      .reduce((sum, stack) => sum + stack.length, 0);

    if (total === 52) {
      clearInterval(timerInterval);

      Swal.fire({
        title: "Congratulations!",
        text: `You won the game in ${timerEl.textContent}! Do you want to play again?`,
        icon: "success",
        showCancelButton: true,
        confirmButtonText: "Play again",
        cancelButtonText: "Close"
      }).then(result => {
        if (result.isConfirmed) {
          startGame();
        }
      });
    }
  }

  // Game state variables
  let deck = createDeck();
  let stock = [];
  let waste = [];
  const columns = Array.from({ length: 7 }, () => []);
  const foundations = { heart: [], diamond: [], spade: [], club: [] };

  let seconds = 0;
  let timerInterval = null;

  const columnEls = [...document.querySelectorAll(".column")];
  const stockEl = document.getElementById("stock");
  const wasteEl = document.getElementById("waste");

  const foundationEls = {
    heart: document.getElementById("foundation-heart"),
    diamond: document.getElementById("foundation-diamond"),
    spade: document.getElementById("foundation-spade"),
    club: document.getElementById("foundation-club")
  };

  const timerEl = document.getElementById("timer");

  // Update timer display
  function updateHUD() {
    const m = String(Math.floor(seconds / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    timerEl.textContent = `${m}:${s}`;
  }

  function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      seconds++;
      updateHUD();
    }, 1000);
  }
    // Create card HTML element
  function createCardElement(card) {
    const el = document.createElement("div");
    el.className = "card";
    el.dataset.suit = card.suit;
    el.dataset.value = card.value;
    el.dataset.color = card.color;
    el.dataset.symbol = card.symbol;

    if (card.faceDown) {
      el.classList.add("back");
    } else {
      renderCardFace(el);
    }
    return el;
  }

  // Render
  function renderCardFace(cardEl) {
    cardEl.classList.remove("back");
    cardEl.classList.add(cardEl.dataset.color);

    const value = cardEl.dataset.value;
    const symbol = cardEl.dataset.symbol;

    cardEl.innerHTML = `
      <div class="top">${value}${symbol}</div>
      <div class="bottom">${value}${symbol}</div>
    `;
  }

  function renderColumn(index) {
    const columnEl = columnEls[index];
    columnEl.innerHTML = "";

    columns[index].forEach((card, i) => {
      const cardEl = createCardElement(card);
      cardEl.style.top = `${i * 10}px`;
      columnEl.appendChild(cardEl);

      if (!card.faceDown) makeDraggable(cardEl);
    });
  }

  function renderFoundations() {
    Object.entries(foundations).forEach(([suit, stack]) => {
      const el = foundationEls[suit];
      el.innerHTML = "";
      if (stack.length) el.appendChild(createCardElement(stack.at(-1)));
    });
  }

  function renderStock() {
    stockEl.innerHTML = "";
    stock.forEach(() => {
      const el = document.createElement("div");
      el.className = "card back";
      stockEl.appendChild(el);
    });
  }

  function renderWaste() {
    wasteEl.innerHTML = "";
    if (!waste.length) return;

    const cardEl = createCardElement(waste.at(-1));
    wasteEl.appendChild(cardEl);
    makeDraggable(cardEl);
  }

  function renderAll() {
    columnEls.forEach((_, i) => renderColumn(i));
    renderStock();
    renderWaste();
    renderFoundations();
  }

  // Make card draggable
  function makeDraggable(el) {
    $(el).draggable({
      revert: "invalid",
      zIndex: 1000,
      helper: "clone"
    });
  }

  // Flip top card of a column if face down
  function flipTopCard(colIndex) {
    const stack = columns[colIndex];
    if (!stack.length) return;

    const top = stack.at(-1);
    if (top.faceDown) {
      top.faceDown = false;
      renderColumn(colIndex);
    }
  }

  // Setup interactions
  function setupStockClick() {
    stockEl.onclick = function () {
      if (stock.length > 0) {
        const card = stock.pop();
        card.faceDown = false;
        waste.push(card);
      } else {
        stock = waste.map(card => ({ ...card, faceDown: true }));
        waste = [];
      }

      renderStock();
      renderWaste();
    };
  }

  // Make columns droppable
  function setupColumnDrop() {
    $(".column").droppable({
      accept: ".card:not(.back)",
      tolerance: "pointer",
      drop: function (_, ui) {

        const cardEl = ui.draggable[0];
        const toColIndex = columnEls.indexOf(this);
        const fromColIndex = columnEls.findIndex(col => col.contains(cardEl));

        let sourceStack;
        let movingCards;

        if (fromColIndex === -1) {
          sourceStack = waste;
          movingCards = [waste.at(-1)];
        } else {
          sourceStack = columns[fromColIndex];
          const cardIndex = [...columnEls[fromColIndex].children].indexOf(cardEl);
          movingCards = sourceStack.slice(cardIndex);
        }

        const movingCard = movingCards[0];
        const targetStack = columns[toColIndex];
        const targetCard = targetStack.at(-1);

        let canDrop = false;

        if (!targetCard) {
          canDrop = movingCard.value === "K";
        } else {
          canDrop =
            movingCard.color !== targetCard.color &&
            getValueNumber(movingCard.value) ===
            getValueNumber(targetCard.value) - 1;
        }

        if (!canDrop) return;

        sourceStack.splice(sourceStack.length - movingCards.length);
        movingCards.forEach(card => targetStack.push(card));

        renderAll();

        if (fromColIndex !== -1) flipTopCard(fromColIndex);
      }
    });
  }

  // Make foundations droppable
  function setupFoundationDrop() {
    $(".foundation").droppable({
      accept: ".card:not(.back)",
      tolerance: "pointer",
      drop: function (_, ui) {

        const cardEl = ui.draggable[0];
        const suit = this.id.replace("foundation-", "");
        const foundationStack = foundations[suit];

        let sourceStack =
          waste.at(-1)?.value === cardEl.dataset.value
            ? waste
            : columns.find(col =>
                col.at(-1)?.value === cardEl.dataset.value &&
                col.at(-1)?.suit === cardEl.dataset.suit
              );

        if (!sourceStack) return;

        const card = sourceStack.at(-1);
        const topFoundation = foundationStack.at(-1);

        let canDrop = false;

        if (!topFoundation) {
          canDrop = card.value === "A" && card.suit === suit;
        } else {
          canDrop =
            card.suit === suit &&
            getValueNumber(card.value) ===
            getValueNumber(topFoundation.value) + 1;
        }

        if (!canDrop) return;

        sourceStack.pop();
        foundationStack.push(card);

        renderAll();
        checkWin();

        const fromColIndex = columns.indexOf(sourceStack);
        if (fromColIndex !== -1) flipTopCard(fromColIndex);
      }
    });
  }

  // Setup interactions
  function setupInteractions() {
    setupStockClick();
    setupColumnDrop();
    setupFoundationDrop();
  }

  // Start a new game
  function startGame() {
    shuffle(deck);

    stock = deck.slice(0, 24).map(c => ({ ...c, faceDown: true }));
    waste = [];
    columns.forEach(c => c.length = 0);
    Object.values(foundations).forEach(f => f.length = 0);

    seconds = 0;
    updateHUD();
    startTimer();

    let index = 24;
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row <= col; row++) {
        const card = { ...deck[index++] };
        card.faceDown = row < col;
        columns[col].push(card);
      }
    }

    renderAll();
    setupInteractions();
  }

  startGame();
};
