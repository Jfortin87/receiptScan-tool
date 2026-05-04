const API_BASE_URL = "http://localhost:3000";

// mt -- Dashboard toggle elements
const uploadEditToggleBtn = document.getElementById("uploadEditToggleBtn");
const uploadEditPanel = document.getElementById("uploadEditPanel");

// mt -- Group elements
const createGroupForm = document.getElementById("createGroupForm");
const groupTitleInput = document.getElementById("groupTitle");
const groupStatus = document.getElementById("groupStatus");

const loadGroupsBtn = document.getElementById("loadGroupsBtn");
const groupsContainer = document.getElementById("groupsContainer");

const selectedGroupText = document.getElementById("selectedGroupText");

const groupCount = document.getElementById("groupCount");

// mt -- Upload elements
const uploadReceiptForm = document.getElementById("uploadReceiptForm");
const receiptImageInput = document.getElementById("receiptImage");
const uploadStatus = document.getElementById("uploadStatus");

// mt -- Receipt display
const receiptsContainer = document.getElementById("receiptsContainer");

let selectedGroupId = null;
let selectedGroupTitle = null;


// mt -- Dates format Conversion
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

// mt -- Show / hide full Upload Edit panel
uploadEditToggleBtn.addEventListener("click", () => {
    if (uploadEditPanel.style.display === "none") {
        uploadEditPanel.style.display = "grid";
        uploadEditToggleBtn.textContent = "Hide";
    } else {
        uploadEditPanel.style.display = "none";
        uploadEditToggleBtn.textContent = "Upload / Edit";
    }
});


// mt -- Create receipt group
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


// mt -- Upload receipt into selected group
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
    if (!selectedGroupId) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/receipts/group/${selectedGroupId}`);
        const receipts = await res.json();

        receiptsContainer.innerHTML = "";

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
                        <button type="button" class="deleteReceiptBtn">Delete Receipt</button>
                    </div>
                </div>

                <img src="${receipt.imagePath}" alt="Receipt image" class="receiptImage">

                <h4>Raw OCR Text</h4>
                <pre>${receipt.rawText || "No text found."}</pre>
            `;

            const deleteReceiptBtn = receiptCard.querySelector(".deleteReceiptBtn");

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
    } catch (error) {
        console.error("LOAD RECEIPTS FRONTEND ERROR:", error);
        receiptsContainer.innerHTML = "<p>Failed to load receipts.</p>";
    }
}


// mt -- Load groups on page load
loadGroups();