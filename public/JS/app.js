const API_BASE_URL = "http://localhost:3000";

//!     -- Dashboard toggle elements
const uploadEditToggleBtn = document.getElementById("uploadEditToggleBtn");
const uploadEditPanel = document.getElementById("uploadEditPanel");

//!     -- Group elements
const createGroupForm = document.getElementById("createGroupForm");
const groupTitleInput = document.getElementById("groupTitle");
const groupStatus = document.getElementById("groupStatus");

const loadGroupsBtn = document.getElementById("loadGroupsBtn");
const groupsContainer = document.getElementById("groupsContainer");

const selectedGroupText = document.getElementById("selectedGroupText");

const groupCount = document.getElementById("groupCount");

//!               ----      Receipts        ----

//mt     -- Upload elements
const uploadReceiptForm = document.getElementById("uploadReceiptForm");
const receiptImageInput = document.getElementById("receiptImage");
const uploadStatus = document.getElementById("uploadStatus");

//mt     -- Receipt display
const receiptsContainer = document.getElementById("receiptsContainer");

//mt    -- Receipts   ( Mini Dash )
const selectedReceiptGroupTitle = document.getElementById("selectedReceiptGroupTitle");
const selectedReceiptCount = document.getElementById("selectedReceiptCount");
const toggleReceiptTextBtn = document.getElementById("toggleReceiptTextBtn");

//mt    -- Hidden edit Receipt Form
const editReceiptDataPanel = document.getElementById("editReceiptDataPanel");
const closeEditReceiptDataBtn = document.getElementById("closeEditReceiptDataBtn");
const editingReceiptFileName = document.getElementById("editingReceiptFileName");

//mt    -- Receipt Details
const editReceiptDataForm = document.getElementById("editReceiptDataForm");


const editStoreName = document.getElementById("editStoreName");
const editReceiptDate = document.getElementById("editReceiptDate");
const editOrderNumber = document.getElementById("editOrderNumber");
const editCashierNumber = document.getElementById("editCashierNumber");
const editCustomerNumber = document.getElementById("editCustomerNumber");
const editPhoneNumber = document.getElementById("editPhoneNumber");

const editSubTotal = document.getElementById("editSubTotal");
const editCannabisExciseTax = document.getElementById("editCannabisExciseTax");
const editLocalTax = document.getElementById("editLocalTax");
const editMaSalesTax = document.getElementById("editMaSalesTax");
const editTotalTax = document.getElementById("editTotalTax");
const editDiscount = document.getElementById("editDiscount");
const editGrandTotal = document.getElementById("editGrandTotal");

const editTotalItems = document.getElementById("editTotalItems");
const editTotalGrams = document.getElementById("editTotalGrams");
const editStartingAllotment = document.getElementById("editStartingAllotment");
const editRemainingAllotment = document.getElementById("editRemainingAllotment");

const addReceiptItemBtn = document.getElementById("addReceiptItemBtn");
const receiptItemsContainer = document.getElementById("receiptItemsContainer");

//mt    -- Gemini auto fill
const autoFillReceiptDataBtn = document.getElementById("autoFillReceiptDataBtn");


let selectedGroupId = null;
let selectedGroupTitle = null;
let showRawReceiptText = false;
let editingReceiptId = null;




//!     ----    Helpers     ----

// mt -- Fill edit form with parsed AI receipt data
function fillReceiptFormFromParsedData(parsedData) {
    editStoreName.value = parsedData.storeName || "";
    editReceiptDate.value = parsedData.receiptDate || "";
    editOrderNumber.value = parsedData.orderNumber || "";
    editCashierNumber.value = parsedData.cashierNumber || "";
    editCustomerNumber.value = parsedData.customerNumber || "";
    editPhoneNumber.value = parsedData.phoneNumber || "";

    editSubTotal.value = parsedData.subTotal || "";
    editCannabisExciseTax.value = parsedData.cannabisExciseTax || "";
    editLocalTax.value = parsedData.localTax || "";
    editMaSalesTax.value = parsedData.maSalesTax || "";
    editTotalTax.value = parsedData.totalTax || "";
    editDiscount.value = parsedData.discount || "";
    editGrandTotal.value = parsedData.grandTotal || "";

    editTotalItems.value = parsedData.totalItems || "";
    editTotalGrams.value = parsedData.totalGrams || "";
    editStartingAllotment.value = parsedData.startingAllotment || "";
    editRemainingAllotment.value = parsedData.remainingAllotment || "";

    // mt -- Fill item rows from AI parsed data
    receiptItemsContainer.innerHTML = "";

    if (Array.isArray(parsedData.items)) {
        parsedData.items.forEach((item) => {
            createReceiptItemRow(item);
        });
    }
}

// mt -- Get all receipt item rows from edit form
function getReceiptItemsFromForm() {
    const itemRows = document.querySelectorAll(".receiptItemRow");

    const items = [];

    itemRows.forEach((row) => {
        items.push({
            itemName: row.querySelector(".itemNameInput").value.trim(),
            itemDetails: row.querySelector(".itemDetailsInput").value.trim(),
            itemPrice: row.querySelector(".itemPriceInput").value,
            itemQuantity: row.querySelector(".itemQuantityInput").value,
            itemGrams: row.querySelector(".itemGramsInput").value,
            itemTotal: row.querySelector(".itemTotalInput").value
        });
    });

    return items;
}

// mt -- Create receipt item row in edit form
function createReceiptItemRow(item = {}) {
    const itemRow = document.createElement("div");
    itemRow.className = "receiptItemRow";

    itemRow.innerHTML = `
        <label>
            Item Name
            <input type="text" class="itemNameInput" value="${item.itemName || ""}" placeholder="Item name">
        </label>

        <label>
            Details
            <input type="text" class="itemDetailsInput" value="${item.itemDetails || ""}" placeholder="Item details">
        </label>

        <label>
            Price
            <input type="number" class="itemPriceInput" step="0.01" value="${item.itemPrice || ""}" placeholder="0.00">
        </label>

        <label>
            Total Items
            <input type="number" class="itemQuantityInput" step="1" value="${item.itemQuantity || ""}" placeholder="0">
        </label>

        <label>
            Grams
            <input type="number" class="itemGramsInput" step="0.01" value="${item.itemGrams || ""}" placeholder="0.00">
        </label>

        <label>
            Item Total
            <input type="number" class="itemTotalInput" step="0.01" value="${item.itemTotal || ""}" placeholder="0.00">
        </label>

        <button type="button" class="removeReceiptItemBtn">Remove</button>
    `;

    const removeReceiptItemBtn = itemRow.querySelector(".removeReceiptItemBtn");



    removeReceiptItemBtn.addEventListener("click", () => {
        itemRow.remove();
    });

    receiptItemsContainer.appendChild(itemRow);
}

//mt    -- Update last upload date for selected group
function updateLastUpload(receipts = []) {
    if (!receipts.length) {
        receiptDashLastUpload.textContent = "No uploads yet";
        return;
    }

    const newestReceipt = receipts.reduce((newest, receipt) => {
        const receiptDate = new Date(receipt.createdAt);
        const newestDate = new Date(newest.createdAt);

        return receiptDate > newestDate ? receipt : newest;
    });

    receiptDashLastUpload.textContent = formatReadableDate(newestReceipt.createdAt);
}


//mt    -- Format money values
function formatMoney(value) {
    const numberValue = Number(value);

    if (!numberValue) {
        return "$0.00";
    }

    return numberValue.toLocaleString("en-US", {
        style: "currency",
        currency: "USD"
    });
}

//mt    -- Format receipt date only
function formatDateOnly(dateValue) {
    if (!dateValue) {
        return "Not added";
    }

    const dateParts = dateValue.split("-");

    if (dateParts.length !== 3) {
        return dateValue;
    }

    const year = dateParts[0];
    const month = dateParts[1];
    const day = dateParts[2];

    return `${month}/${day}/${year}`;
}

//mt   -- Load formatted receipt data into edit form
async function loadReceiptDataIntoForm(receiptId) {
    try {
        const res = await fetch(`${API_BASE_URL}/api/receipts/${receiptId}/details`);
        const data = await res.json();

        const receipt = data.receipt;

        const items = data.items || [];

        editStoreName.value = receipt.storeName || "";
        editReceiptDate.value = receipt.receiptDate || "";
        editOrderNumber.value = receipt.orderNumber || "";
        editCashierNumber.value = receipt.cashierNumber || "";
        editCustomerNumber.value = receipt.customerNumber || "";
        editPhoneNumber.value = receipt.phoneNumber || "";

        editSubTotal.value = receipt.subTotal || "";
        editCannabisExciseTax.value = receipt.cannabisExciseTax || "";
        editLocalTax.value = receipt.localTax || "";
        editMaSalesTax.value = receipt.maSalesTax || "";
        editTotalTax.value = receipt.totalTax || "";
        editDiscount.value = receipt.discount || "";
        editGrandTotal.value = receipt.grandTotal || "";

        editTotalItems.value = receipt.totalItems || "";
        editTotalGrams.value = receipt.totalGrams || "";
        editStartingAllotment.value = receipt.startingAllotment || "";
        editRemainingAllotment.value = receipt.remainingAllotment || "";

        //st     -- Load saved item rows
        receiptItemsContainer.innerHTML = "";

        items.forEach((item) => {
            createReceiptItemRow(item);
        });

        console.log("Loaded receipt details:", data);
    } catch (error) {
        console.error("LOAD RECEIPT DATA INTO FORM ERROR:", error);
    }
}

//mt    -- Show / hide raw OCR text
function updateReceiptTextVisibility() {
    const rawTextSections = document.querySelectorAll(".rawOcrTextSection");

    rawTextSections.forEach((section) => {
        section.style.display = showRawReceiptText ? "block" : "none";
    });

    toggleReceiptTextBtn.textContent = showRawReceiptText ? "Hide Text" : "Show Text";
}

//mt     -- Update receipts section title
function updateSelectedReceiptsHeader(count = 0) {
    if (!selectedGroupTitle) {
        selectedReceiptGroupTitle.textContent = "(None)";
        selectedReceiptCount.textContent = "(0)";
        return;
    }

    selectedReceiptGroupTitle.textContent = `${selectedGroupTitle}`;
    selectedReceiptCount.textContent = `(${count})`;
}


//mt     -- Dates format Conversion
function formatReadableDate(dateValue) {
    if (!dateValue) {
        return "No date";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return "Invalid date";
    }

    return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
    });
}

// mt -- Add receipt item row
addReceiptItemBtn.addEventListener("click", () => {
    createReceiptItemRow();
});

//mt    -- Show / hide full Upload Edit panel
uploadEditToggleBtn.addEventListener("click", () => {
    if (uploadEditPanel.style.display === "none") {
        uploadEditPanel.style.display = "grid";
        uploadEditToggleBtn.textContent = "Hide";
    } else {
        uploadEditPanel.style.display = "none";
        uploadEditToggleBtn.textContent = "Upload / Edit";
    }
});


//mt   -- Create receipt group
createGroupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const title = groupTitleInput.value.trim();

    if (!title) {
        groupStatus.textContent = "Group title is required.";
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/api/groups`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ title })
        });

        const data = await res.json();

        if (!res.ok) {
            groupStatus.textContent = data.error || "Failed to create group.";
            return;
        }

        groupStatus.textContent = "Group created.";
        groupTitleInput.value = "";

        await loadGroups();
    } catch (error) {
        console.error("CREATE GROUP FRONTEND ERROR:", error);
        groupStatus.textContent = "Server error while creating group.";
    }
});


//mt     -- Load all groups
async function loadGroups() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/groups`);
        const groups = await res.json();

        groupsContainer.innerHTML = "";
        groupCount.textContent = `(${groups.length})`;

        if (!groups.length) {
            groupsContainer.innerHTML = "<p>No groups found.</p>";
            return;
        }

        groups.forEach((group) => {
            const groupCard = document.createElement("div");
            groupCard.className = "groupCard";

            //st     -- Keep selected group highlighted after refresh
            if (group.id === selectedGroupId) {
                groupCard.classList.add("selectedGroup");
            }

            const readableDate = formatReadableDate(group.createdAt);

            // mt -- Receipt count for this group
            const receiptCount = group.receiptCount ?? 0;

            groupCard.innerHTML = `
                <h3>${group.title} (${receiptCount})</h3>
                <p>Created: ${readableDate}</p>

                <div class="groupActions">
                    <button type="button" class="selectGroupBtn">Select Group</button>
                    <button type="button" class="deleteGroupBtn">Delete Group</button>
                </div>
            `;

            const selectBtn = groupCard.querySelector(".selectGroupBtn");
            const deleteBtn = groupCard.querySelector(".deleteGroupBtn");

            //st     -- Select group
            selectBtn.addEventListener("click", async () => {
                selectedGroupId = group.id;
                selectedGroupTitle = group.title;

                selectedGroupText.textContent = selectedGroupTitle;

                const allGroupCards = document.querySelectorAll(".groupCard");

                allGroupCards.forEach((card) => {
                    card.classList.remove("selectedGroup");
                });

                groupCard.classList.add("selectedGroup");

                await loadReceiptsForSelectedGroup();
            });

            //st     -- Delete group
            deleteBtn.addEventListener("click", async () => {
                const confirmDelete = confirm(
                    `Delete this group?\n\n${group.title}\n\nThis will also delete all receipts inside this group.`
                );

                if (!confirmDelete) {
                    return;
                }

                try {
                    const deleteRes = await fetch(`${API_BASE_URL}/api/groups/${group.id}`, {
                        method: "DELETE"
                    });

                    const deleteData = await deleteRes.json();

                    if (!deleteRes.ok) {
                        alert(deleteData.error || "Failed to delete group.");
                        return;
                    }

                    //stt -- If deleted group was selected, clear selected group display
                    if (selectedGroupId === group.id) {
                        selectedGroupId = null;
                        selectedGroupTitle = null;

                        selectedGroupText.textContent = "None";
                        receiptsContainer.innerHTML = "";
                        updateSelectedReceiptsHeader(0);
                    }

                    await loadGroups();
                } catch (error) {
                    console.error("DELETE GROUP FRONTEND ERROR:", error);
                    alert("Server error while deleting group.");
                }
            });

            groupsContainer.appendChild(groupCard);
        });
    } catch (error) {
        console.error("LOAD GROUPS FRONTEND ERROR:", error);
        groupsContainer.innerHTML = "<p>Failed to load groups.</p>";
    }
}



loadGroupsBtn.addEventListener("click", loadGroups);


// mt -- Auto fill receipt data from OCR using Gemini
autoFillReceiptDataBtn.addEventListener("click", async () => {
    if (!editingReceiptId) {
        alert("No receipt selected.");
        return;
    }

    try {
        console.log("Auto filling receipt:", editingReceiptId);

        const res = await fetch(`${API_BASE_URL}/api/receipts/${editingReceiptId}/auto-fill`, {
            method: "POST"
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || "Failed to auto fill receipt data");
        }

        console.log("Auto fill result:", data);

        fillReceiptFormFromParsedData(data.parsedData);
        alert("Auto fill complete. Check console for parsed data.");

    } catch (error) {
        console.error("AUTO FILL RECEIPT DATA ERROR:", error);
        alert("Failed to auto fill receipt data.");
    }
});

//mt    -- Save formatted receipt data
editReceiptDataForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!editingReceiptId) {
        alert("No receipt selected.");
        return;
    }

    const formattedReceiptData = {
        storeName: editStoreName.value.trim(),
        receiptDate: editReceiptDate.value,
        orderNumber: editOrderNumber.value.trim(),
        cashierNumber: editCashierNumber.value.trim(),
        customerNumber: editCustomerNumber.value.trim(),
        phoneNumber: editPhoneNumber.value.trim(),

        subTotal: editSubTotal.value,
        cannabisExciseTax: editCannabisExciseTax.value,
        localTax: editLocalTax.value,
        maSalesTax: editMaSalesTax.value,
        totalTax: editTotalTax.value,
        discount: editDiscount.value,
        grandTotal: editGrandTotal.value,

        totalItems: editTotalItems.value,
        totalGrams: editTotalGrams.value,
        startingAllotment: editStartingAllotment.value,
        remainingAllotment: editRemainingAllotment.value
    };

    try {
        const res = await fetch(`${API_BASE_URL}/api/receipts/${editingReceiptId}/formatted-data`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(formattedReceiptData)
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || "Failed to save receipt data");
        }

        // mt -- Save receipt items after main receipt data saves
        const receiptItems = getReceiptItemsFromForm();

        const itemsRes = await fetch(`${API_BASE_URL}/api/receipts/${editingReceiptId}/items`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                items: receiptItems
            })
        });

        const itemsData = await itemsRes.json();

        if (!itemsRes.ok) {
            throw new Error(itemsData.error || "Failed to save receipt items");
        }

        console.log("Saved receipt data:", data);
        console.log("Saved receipt items:", itemsData);

        alert("Receipt data saved.");

    } catch (error) {
        console.error("SAVE RECEIPT DATA ERROR:", error);
        alert("Failed to save receipt data.");
    }
});



//mt   -- Toggle raw OCR text display
toggleReceiptTextBtn.addEventListener("click", () => {
    showRawReceiptText = !showRawReceiptText;
    updateReceiptTextVisibility();
});


//mt    -- Upload receipt into selected group
uploadReceiptForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!selectedGroupId) {
        uploadStatus.textContent = "Select a group first.";
        return;
    }

    const file = receiptImageInput.files[0];

    if (!file) {
        uploadStatus.textContent = "Choose a receipt image first.";
        return;
    }

    const formData = new FormData();
    formData.append("receiptImage", file);

    try {
        uploadStatus.textContent = "Uploading and scanning receipt...";

        const res = await fetch(`${API_BASE_URL}/api/receipts/upload/${selectedGroupId}`, {
            method: "POST",
            body: formData
        });

        const data = await res.json();

        if (!res.ok) {
            uploadStatus.textContent = data.error || "Failed to upload receipt.";
            return;
        }

        uploadStatus.textContent = "Receipt uploaded and scanned.";
        receiptImageInput.value = "";

        await loadReceiptsForSelectedGroup();
        await loadGroups();

    } catch (error) {
        console.error("UPLOAD RECEIPT FRONTEND ERROR:", error);
        uploadStatus.textContent = "Server error while uploading receipt.";
    }
});


//mt     -- Load receipts for selected group
async function loadReceiptsForSelectedGroup() {
    if (!selectedGroupId) {
        receiptsContainer.innerHTML = "<p>Select a group to view receipts.</p>";
        updateSelectedReceiptsHeader(0);
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/api/receipts/group/${selectedGroupId}`);
        const receipts = await res.json();

        receiptsContainer.innerHTML = "";
        updateSelectedReceiptsHeader(receipts.length);
        updateLastUpload(receipts);

        if (!receipts.length) {
            receiptsContainer.innerHTML = "<p>No receipts uploaded for this group yet.</p>";
            return;
        }

        receipts.forEach((receipt) => {
            const receiptCard = document.createElement("div");
            receiptCard.className = "receiptCard";

            const readableDate = formatReadableDate(receipt.createdAt);

            receiptCard.innerHTML = `
                <div class="receiptTop">
                    <div>
                        <h3>${receipt.originalFileName}</h3>
                        <p>Uploaded: ${readableDate}</p>
                    </div>

                    <div class="receiptActions">
                        <a href="${receipt.imagePath}" target="_blank">View Image</a>
                        <button type="button" class="editReceiptDataBtn">Edit Data</button>
                        <button type="button" class="deleteReceiptBtn">Delete Receipt</button>
                    </div>
                </div>

                <div class="formattedReceiptPreview">
                    <p><strong>Store:</strong> ${receipt.storeName || "Not added"}</p>
                    <p><strong>Receipt Date:</strong> ${formatDateOnly(receipt.receiptDate)}</p>

                    <hr>

                    <p><strong>Sub Total:</strong> ${formatMoney(receipt.subTotal)}</p>
                    <p><strong>Cannabis Excise Tax:</strong> ${formatMoney(receipt.cannabisExciseTax)}</p>
                    <p><strong>Local Tax:</strong> ${formatMoney(receipt.localTax)}</p>
                    <p><strong>MA Sales Tax:</strong> ${formatMoney(receipt.maSalesTax)}</p>
                    <p><strong>Total Tax:</strong> ${formatMoney(receipt.totalTax)}</p>
                    <p><strong>Discount:</strong> ${formatMoney(receipt.discount)}</p>
                    <p><strong>Grand Total:</strong> ${formatMoney(receipt.grandTotal)}</p>
                    <hr>

                    <p><strong>Total Items:</strong> ${receipt.totalItems || 0}</p>
                    <p><strong>Total Grams:</strong> ${receipt.totalGrams || 0}</p>
                    <p><strong>Starting Allotment:</strong> ${receipt.startingAllotment || 0}</p>
                    <p><strong>Remaining Allotment:</strong> ${receipt.remainingAllotment || 0}</p>
                </div>

                <img src="${receipt.imagePath}" alt="Receipt image" class="receiptImage">


                <div class="rawOcrTextSection">
                    <h4>Raw OCR Text</h4>
                    <pre>${receipt.rawText || "No text found."}</pre>

                </div>
            `;

            const editReceiptDataBtn = receiptCard.querySelector(".editReceiptDataBtn");
            const deleteReceiptBtn = receiptCard.querySelector(".deleteReceiptBtn");

            closeEditReceiptDataBtn.addEventListener("click", () => {
                editingReceiptId = null;

                editingReceiptFileName.textContent = "None";
                editReceiptDataPanel.style.display = "none";
            });

            //st    -- Edit Btn
            editReceiptDataBtn.addEventListener("click", async () => {
                editingReceiptId = receipt.id;

                editingReceiptFileName.textContent = receipt.originalFileName;
                editReceiptDataPanel.style.display = "block";

                await loadReceiptDataIntoForm(editingReceiptId);

                console.log("Editing receipt:", editingReceiptId);
            });

            //st    -- Delete Btn
            deleteReceiptBtn.addEventListener("click", async () => {
                const confirmDelete = confirm(
                    `Delete this receipt?\n\n${receipt.originalFileName}`
                );

                if (!confirmDelete) {
                    return;
                }

                try {
                    const deleteRes = await fetch(`${API_BASE_URL}/api/receipts/${receipt.id}`, {
                        method: "DELETE"
                    });

                    const deleteData = await deleteRes.json();

                    if (!deleteRes.ok) {
                        alert(deleteData.error || "Failed to delete receipt.");
                        return;
                    }

                    await loadReceiptsForSelectedGroup();
                    await loadGroups();

                } catch (error) {
                    console.error("DELETE RECEIPT FRONTEND ERROR:", error);
                    alert("Server error while deleting receipt.");
                }
            });

            receiptsContainer.appendChild(receiptCard);
        });

        updateReceiptTextVisibility();


    } catch (error) {
        console.error("LOAD RECEIPTS FRONTEND ERROR:", error);
        receiptsContainer.innerHTML = "<p>Failed to load receipts.</p>";
    }
}


// mt -- Load groups on page load
updateSelectedReceiptsHeader(0);
loadGroups();