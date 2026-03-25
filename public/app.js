import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-analytics.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import {
  getFirestore,
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBjinHFb07FcR231RZ-LuGzxWVK2A3VZCU",
  authDomain: "tfvprofessorfrancken.firebaseapp.com",
  projectId: "tfvprofessorfrancken",
  storageBucket: "tfvprofessorfrancken.firebasestorage.app",
  messagingSenderId: "756516241507",
  appId: "1:756516241507:web:8ac2dcafb8106027073856",
  measurementId: "G-LJPT08PM9J"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
void analytics;

const auth = getAuth(app);
const db = getFirestore(app);
let currentUser = null;
let currentMember = null;

const qs = (id) => document.getElementById(id);
const sections = ["member-dashboard", "orders-section", "activities-section", "books-section", "photos-section", "budget-section", "admin-section"];

const staticNews = [
  "March 2026: Board approved semester activity package.",
  "Photo committee published winter gala photos.",
  "Merchandise store now includes varsity hoodies."
];

const staticActivities = [
  "City Tour - 2026-04-08",
  "Book Exchange Fair - 2026-04-22",
  "Inter-association Sports Day - 2026-05-03"
];

function renderPublicContent() {
  qs("news-list").innerHTML = staticNews.map((n) => `<li>${n}</li>`).join("");
  qs("upcoming-activities").innerHTML = staticActivities.map((a) => `<li>${a}</li>`).join("");
}

async function renderCommitteesAndBoard() {
  const committeeSnap = await getDocs(collection(db, "committees"));
  qs("committee-list").innerHTML = committeeSnap.docs.map((d) => `<li>${d.data().name}</li>`).join("") || "<li>No committees yet</li>";

  const boardSnap = await getDocs(collection(db, "board"));
  qs("board-list").innerHTML = boardSnap.docs
    .map((d) => `<li>${d.data().position}: ${d.data().member_name || d.data().member_id}</li>`)
    .join("") || "<li>No board members yet</li>";
}

function showAuthedSections(role) {
  sections.forEach((id) => qs(id).classList.remove("is-hidden"));
  if (!["admin", "board"].includes(role)) {
    qs("admin-section").classList.add("is-hidden");
  }
}

function hideAuthedSections() {
  sections.forEach((id) => qs(id).classList.add("is-hidden"));
}

async function ensureMemberDoc(user, displayName) {
  const ref = doc(db, "members", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      name: displayName || user.email,
      email: user.email,
      role: "member",
      join_date: serverTimestamp(),
      preferences: [],
      committee: ""
    });
  }
  return (await getDoc(ref)).data();
}

async function ensureOpenInvoice(memberId) {
  const invoiceRef = doc(db, "invoices", `${memberId}_open`);
  const invoiceSnap = await getDoc(invoiceRef);
  if (!invoiceSnap.exists()) {
    await setDoc(invoiceRef, {
      member_id: memberId,
      date_created: serverTimestamp(),
      total_amount: 0,
      status: "pending",
      notes: "Auto-managed open invoice"
    });
  }
  return invoiceRef;
}

async function addInvoiceItem(memberId, type, description, amount) {
  const invoiceRef = await ensureOpenInvoice(memberId);
  await addDoc(collection(db, "invoice_items"), {
    invoice_id: invoiceRef.id,
    type,
    description,
    amount,
    created_at: serverTimestamp()
  });
  const invoiceSnap = await getDoc(invoiceRef);
  const current = invoiceSnap.data().total_amount || 0;
  await updateDoc(invoiceRef, { total_amount: current + amount, updated_at: serverTimestamp() });
}

async function refreshDashboard() {
  qs("profile-name").value = currentMember?.name || "";
  qs("profile-committee").value = currentMember?.committee || "";
  qs("profile-preferences").value = (currentMember?.preferences || []).join(", ");

  const invoices = await getDocs(query(collection(db, "invoices"), where("member_id", "==", currentUser.uid)));
  let total = 0;
  invoices.forEach((d) => {
    total += Number(d.data().total_amount || 0);
  });
  qs("total-balance").textContent = `€${total.toFixed(2)}`;

  const items = await getDocs(query(collection(db, "invoice_items"), orderBy("created_at", "desc")));
  const mine = items.docs.filter((d) => d.data().invoice_id?.startsWith(currentUser.uid));
  qs("invoice-items").innerHTML = mine.map((d) => `<li>${d.data().type}: ${d.data().description} (€${Number(d.data().amount).toFixed(2)})</li>`).join("") || "<li>No invoice items yet</li>";
}

async function loadMembersAndCommittees() {
  const membersSnap = await getDocs(query(collection(db, "members"), orderBy("name")));
  const committees = new Set();
  const members = membersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  members.forEach((m) => m.committee && committees.add(m.committee));
  qs("committee-filter").innerHTML = '<option value="">All committees</option>' + [...committees].map((c) => `<option>${c}</option>`).join("");

  const renderMembers = (committee = "") => {
    const filtered = committee ? members.filter((m) => m.committee === committee) : members;
    qs("member-select").innerHTML = filtered.map((m) => `<option value="${m.id}">${m.name}</option>`).join("");
  };

  renderMembers();
  qs("committee-filter").onchange = (e) => renderMembers(e.target.value);
}

async function loadMenus() {
  const foodSnap = await getDocs(query(collection(db, "food_drinks"), where("availability", "==", true)));
  qs("food-select").innerHTML = foodSnap.docs
    .map((d) => `<option value="${d.id}" data-price="${d.data().price}">${d.data().name} (€${Number(d.data().price).toFixed(2)})</option>`)
    .join("") || '<option value="">No items</option>';

  const merchSnap = await getDocs(query(collection(db, "merchandise"), where("availability_status", "==", "available")));
  qs("merch-select").innerHTML = merchSnap.docs
    .map((d) => `<option value="${d.id}" data-price="${d.data().price}">${d.data().name} (€${Number(d.data().price).toFixed(2)})</option>`)
    .join("") || '<option value="">No merchandise</option>';
}

async function loadActivities() {
  const snap = await getDocs(query(collection(db, "activities"), orderBy("date_time")));
  qs("activity-select").innerHTML = snap.docs
    .map((d) => `<option value="${d.id}" data-price="${d.data().price}">${d.data().name} (${d.data().date_time})</option>`)
    .join("") || '<option value="">No activities</option>';
}

async function loadBooks(filter = "") {
  const snap = await getDocs(query(collection(db, "second_hand_books"), where("status", "==", "available")));
  const books = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((b) => `${b.title} ${b.author}`.toLowerCase().includes(filter.toLowerCase()));
  qs("book-list").innerHTML = books
    .map(
      (b) => `<li>
      <strong>${b.title}</strong> - ${b.author} | ${b.condition} | €${Number(b.price).toFixed(2)}
      <button data-book="${b.id}" class="buy-book">Buy</button>
    </li>`
    )
    .join("") || "<li>No books found.</li>";

  document.querySelectorAll(".buy-book").forEach((btn) => {
    btn.onclick = async () => {
      const bookId = btn.getAttribute("data-book");
      const bookRef = doc(db, "second_hand_books", bookId);
      const bookSnap = await getDoc(bookRef);
      const book = bookSnap.data();
      await updateDoc(bookRef, { status: "sold", buyer_member_id: currentUser.uid, date_sold: serverTimestamp() });
      await addInvoiceItem(currentUser.uid, "book", `Book purchase: ${book.title}`, Number(book.price));
      await loadBooks(qs("book-search").value);
      await refreshDashboard();
    };
  });
}

async function loadPhotos(filter = "") {
  const snap = await getDocs(query(collection(db, "photos"), orderBy("date_uploaded", "desc")));
  const photos = snap.docs.map((d) => d.data()).filter((p) => `${p.activity_id} ${p.caption || ""} ${p.date_uploaded || ""}`.toLowerCase().includes(filter.toLowerCase()));
  qs("photo-list").innerHTML = photos
    .map((p) => `<li><a href="${p.url}" target="_blank" rel="noopener">${p.caption || p.filename || "Photo"}</a> (${p.activity_id})</li>`)
    .join("") || "<li>No photos uploaded yet.</li>";
}

async function loadBudgets() {
  const snap = await getDocs(query(collection(db, "committee_budgets"), orderBy("submission_date", "desc")));
  qs("budget-list").innerHTML = snap.docs
    .map((d) => `<li>${d.data().committee_id}: planned €${Number(d.data().planned_budget).toFixed(2)}, spent €${Number(d.data().actual_spent).toFixed(2)} (${d.data().status})</li>`)
    .join("") || "<li>No budgets submitted.</li>";
}

qs("signup-btn").onclick = async () => {
  const email = qs("auth-email").value;
  const password = qs("auth-password").value;
  const name = qs("auth-name").value;
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  currentMember = await ensureMemberDoc(cred.user, name);
};

qs("login-btn").onclick = async () => {
  const email = qs("auth-email").value;
  const password = qs("auth-password").value;
  await signInWithEmailAndPassword(auth, email, password);
};

qs("logout-btn").onclick = async () => {
  await signOut(auth);
};

qs("save-profile-btn").onclick = async () => {
  await updateDoc(doc(db, "members", currentUser.uid), {
    name: qs("profile-name").value,
    committee: qs("profile-committee").value,
    preferences: qs("profile-preferences").value.split(",").map((x) => x.trim()).filter(Boolean)
  });
  currentMember = (await getDoc(doc(db, "members", currentUser.uid))).data();
  await loadMembersAndCommittees();
};

qs("food-order-btn").onclick = async () => {
  const memberId = qs("member-select").value;
  const option = qs("food-select").selectedOptions[0];
  const foodId = option.value;
  const unit = Number(option.dataset.price || 0);
  const qty = Number(qs("food-qty").value || 1);

  await addDoc(collection(db, "food_drink_orders"), {
    member_id: memberId,
    food_id: foodId,
    quantity: qty,
    date_ordered: serverTimestamp(),
    status: "pending"
  });
  await addInvoiceItem(memberId, "food", `Food/drink order (${option.textContent}) x${qty}`, unit * qty);
  if (memberId === currentUser.uid) {
    await refreshDashboard();
  }
};

qs("merch-order-btn").onclick = async () => {
  const memberId = qs("member-select").value;
  const option = qs("merch-select").selectedOptions[0];
  const merchId = option.value;
  const unit = Number(option.dataset.price || 0);
  const qty = Number(qs("merch-qty").value || 1);
  const variant = qs("merch-variant").value;

  await addDoc(collection(db, "merchandise_orders"), {
    member_id: memberId,
    merchandise_id: merchId,
    quantity: qty,
    variant,
    date_ordered: serverTimestamp(),
    status: "pending"
  });

  await addInvoiceItem(memberId, "merchandise", `Merchandise order (${option.textContent}) variant=${variant || "n/a"} x${qty}`, unit * qty);

  const merchRef = doc(db, "merchandise", merchId);
  const merchSnap = await getDoc(merchRef);
  const stock = Number(merchSnap.data().stock || 0);
  await updateDoc(merchRef, { stock: Math.max(stock - qty, 0) });

  if (memberId === currentUser.uid) {
    await refreshDashboard();
  }
};

qs("activity-signup-btn").onclick = async () => {
  const option = qs("activity-select").selectedOptions[0];
  const activityId = option.value;
  const price = Number(option.dataset.price || 0);

  await addDoc(collection(db, "activity_signups"), {
    activity_id: activityId,
    member_id: currentUser.uid,
    status: "confirmed",
    price,
    created_at: serverTimestamp()
  });
  await addInvoiceItem(currentUser.uid, "activity", `Activity signup (${option.textContent})`, price);
  await refreshDashboard();
};

qs("book-search-btn").onclick = () => loadBooks(qs("book-search").value);

qs("list-book-btn").onclick = async () => {
  await addDoc(collection(db, "second_hand_books"), {
    title: qs("new-book-title").value,
    author: qs("new-book-author").value,
    condition: qs("new-book-condition").value,
    price: Number(qs("new-book-price").value || 0),
    seller_member_id: currentUser.uid,
    buyer_member_id: null,
    status: "available",
    date_listed: serverTimestamp()
  });
  await loadBooks();
};

qs("photo-filter").oninput = () => loadPhotos(qs("photo-filter").value);

qs("submit-budget-btn").onclick = async () => {
  await addDoc(collection(db, "committee_budgets"), {
    committee_id: qs("budget-committee").value,
    allocated_by_board: Number(qs("budget-allocated").value || 0),
    planned_budget: Number(qs("budget-planned").value || 0),
    actual_spent: Number(qs("budget-spent").value || 0),
    submission_date: serverTimestamp(),
    status: "submitted",
    submitted_by: currentUser.uid
  });
  await loadBudgets();
};

qs("manual-charge-btn").onclick = async () => {
  const member = qs("manual-charge-member").value;
  const desc = qs("manual-charge-desc").value;
  const amount = Number(qs("manual-charge-amount").value || 0);
  await addInvoiceItem(member, "other", desc, amount);
  qs("admin-message").textContent = "Manual charge added.";
};

qs("generate-sepa-btn").onclick = async () => {
  const pendingInvoices = await getDocs(query(collection(db, "invoices"), where("status", "==", "pending")));
  const ids = pendingInvoices.docs.map((d) => d.id);
  await addDoc(collection(db, "batch_invoices"), {
    date_created: serverTimestamp(),
    description: `SEPA batch for ${ids.length} invoices`,
    status: "pending",
    file_path: "sepa/batch-placeholder.xml",
    sepa_reference: `BATCH-${Date.now()}`,
    invoice_ids: ids
  });
  qs("admin-message").textContent = "SEPA batch placeholder created in batch_invoices.";
};

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (!user) {
    currentMember = null;
    qs("auth-status").textContent = "Not logged in.";
    hideAuthedSections();
    return;
  }

  currentMember = await ensureMemberDoc(user, qs("auth-name").value);
  qs("auth-status").textContent = `Logged in as ${currentMember.name} (${currentMember.role})`;

  showAuthedSections(currentMember.role);
  await Promise.all([
    refreshDashboard(),
    loadMembersAndCommittees(),
    loadMenus(),
    loadActivities(),
    loadBooks(),
    loadPhotos(),
    loadBudgets(),
    renderCommitteesAndBoard()
  ]);
});

renderPublicContent();
renderCommitteesAndBoard();
