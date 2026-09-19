/* =====================================================
   THE MARKET OS
   Application Logic
===================================================== */


/*
    SAMPLE INVENTORY DATABASE

    This is temporary.
    Sprint 2 will replace this with Google Sheets.
*/


const API_URL = "https://script.google.com/macros/s/AKfycbxvtO8ktVL4X7bPojsssHWFtZVzHVqgChFBQZ_Ce5QDBKzhmhKuiUsBdbk_UfagUGC4/exec";
const INVOICE_TEMPLATE_ID =
  "1eO6LAsp8AJ5emetGhI0WAjf1p0tGerHLEnUFc-D-Yzs";

let currentPhone = null;

let pendingSaleTransactionId = null;
let pendingSaleKey = null;

async function apiRequest(data) {

    const action =
        data && data.action
            ? data.action
            : "unknown";

    const formData = new FormData();

    formData.append(
        "payload",
        JSON.stringify(data)
    );


    // =====================================================
    // REQUEST TIMEOUT
    // =====================================================

    const controller =
        new AbortController();

    const timeoutId =
        setTimeout(function () {

            controller.abort();

        }, 90000); // 90 seconds


    const requestStart =
        performance.now();


    try {

        const response =
            await fetch(
                API_URL,
                {
                    method: "POST",
                    body: formData,
                    signal: controller.signal
                }
            );


        clearTimeout(timeoutId);


        const requestTime =
            Math.round(
                performance.now() -
                requestStart
            );


        // =================================================
        // READ RESPONSE AS TEXT FIRST
        // =================================================

        const text =
            await response.text();


        // =================================================
        // HTTP ERROR
        // =================================================

        if (!response.ok) {

            console.error(
                "API HTTP ERROR",
                {
                    action:
                        action,

                    status:
                        response.status,

                    statusText:
                        response.statusText,

                    timeMs:
                        requestTime,

                    response:
                        text.slice(0, 500)
                }
            );


            return {

                success:
                    false,

                message:
                    "Server returned HTTP " +
                    response.status +
                    " for " +
                    action + "."

            };

        }


        // =================================================
        // EMPTY RESPONSE
        // =================================================

        if (
            !text ||
            text.trim() === ""
        ) {

            console.error(
                "API EMPTY RESPONSE",
                {
                    action:
                        action,

                    timeMs:
                        requestTime
                }
            );


            return {

                success:
                    false,

                message:
                    "The server returned an empty response."

            };

        }


        // =================================================
        // PARSE JSON SAFELY
        // =================================================

        try {

            const result =
                JSON.parse(text);


            return result;

        }

        catch (parseError) {

            console.error(
                "API NON-JSON RESPONSE",
                {
                    action:
                        action,

                    timeMs:
                        requestTime,

                    contentType:
                        response.headers
                            .get("content-type"),

                    response:
                        text.slice(0, 500)
                }
            );


            return {

                success:
                    false,

                message:
                    "The server returned an invalid response. " +
                    "Please try again."

            };

        }

    }

    catch (err) {

        clearTimeout(timeoutId);


        // =================================================
        // TIMEOUT
        // =================================================

        if (
            err &&
            err.name === "AbortError"
        ) {

            console.error(
                "API TIMEOUT",
                {
                    action:
                        action,

                    timeoutMs:
                        90000
                }
            );


            return {

                success:
                    false,

                message:
                    "The server took too long to respond. " +
                    "Please try again."

            };

        }


        // =================================================
        // NETWORK / CONNECTION ERROR
        // =================================================

        console.error(
            "API CONNECTION ERROR",
            {
                action:
                    action,

                error:
                    err
                        ? err.message
                        : String(err)
            }
        );


        return {

            success:
                false,

            message:
                "Unable to connect to the server. " +
                "Please try again."

        };

    }

}



/* =====================================================
   ELEMENTS
===================================================== */


const searchButton = document.getElementById("search");

const saveButton = document.getElementById("save");

const phoneResult = document.getElementById("phoneResult");

const toast = document.getElementById("toast");





/* =====================================================
   SEARCH PHONE
===================================================== */


searchButton.addEventListener("click", async function () {

    const batch = document.getElementById("batch").value.trim();
    const imei = document.getElementById("imei").value.trim();

    if (batch === "" || imei === "") {
        showToast("Enter Batch and IMEI.");
        return;
    }

    searchButton.disabled = true;
    searchButton.innerText = "SEARCHING...";

    try {

        const result = await apiRequest({

            action: "search",

            batch: batch,

            imei: imei

        });

        searchButton.disabled = false;
        searchButton.innerText = "SEARCH PRODUCT";

        if (!result.success) {

            phoneResult.classList.add("hidden");

            showToast(result.message);

            return;

        }

        currentPhone = result.data;

        displayPhone(currentPhone);

        showToast("Product found.");

    }

    catch (err) {

        searchButton.disabled = false;

        searchButton.innerText = "SEARCH PRODUCT";

        showToast("Connection error.");

        console.log(err);

    }

});







/* =====================================================
   DISPLAY PHONE RESULT
===================================================== */


function displayPhone(phone){

    phoneResult.classList.remove("hidden");

    const info = document.querySelector(".phone-info");

    info.innerHTML = `

        <p>
        Item:
        <b>${phone.item}</b>
        </p>

        <p>
        Color:
        <b>${phone.color}</b>
        </p>

        <p>
        Status:
        <b>${phone.status}</b>
        </p>

        <p>
        IMEI:
        <b>********${phone.imei.slice(-4)}</b>
        </p>

    `;

}








/* =====================================================
   SAVE SALE
===================================================== */


saveButton.addEventListener("click", async function () {

    if (!currentPhone) {

        showToast("Search a phone first.");

        return;

    }

    const price = document.getElementById("price").value.trim();

    const status = document.getElementById("status").value;

    const month = document.getElementById("month").value;

    const bonus = document.getElementById("bonus").value.trim();

    if (price === "") {

        showToast("Enter selling price.");

        return;

    }

    if (!confirm("Confirm saving this sale?")) {

        return;

    }

    saveButton.disabled = true;

    saveButton.innerText = "SAVING...";

    try {

    const saleKey =
    currentPhone.sheetName + ":" + currentPhone.row;

if (
    !pendingSaleTransactionId ||
    pendingSaleKey !== saleKey
) {
    pendingSaleTransactionId =
        "SALE-" +
        Date.now() +
        "-" +
        Math.random().toString(36).substring(2, 8);

    pendingSaleKey = saleKey;
}

    const result = await apiRequest({

        action: "save",

        sheetName: currentPhone.sheetName,

        row: currentPhone.row,

        sellingPrice: price,

        status: status,

        monthSold: month,

        bonus: bonus,

        transactionId: pendingSaleTransactionId

    });

        saveButton.disabled = false;

        saveButton.innerText = "SAVE SALE";

        if (!result.success) {

            showToast(result.message);

            return;

        }

        showToast("Sale saved successfully.");

        resetForm();

        currentPhone = null;

        pendingSaleTransactionId = null;
        pendingSaleKey = null;

            }

    catch (err) {

        saveButton.disabled = false;

        saveButton.innerText = "SAVE SALE";

        console.log(err);

        showToast("Failed to save sale.");

    }

});








/* =====================================================
   CONFIRMATION
===================================================== */


function confirmSale(){



    let answer =
    confirm(
        "Confirm this sale?\n\n" +
        "The phone status will be updated."
    );




    if(answer){


        showToast("Sale saved successfully ✓");


        resetForm();


    }



}







/* =====================================================
   TOAST MESSAGE
===================================================== */


function showToast(message){



    toast.innerHTML = message;


    toast.style.display = "block";




    setTimeout(function(){


        toast.style.display = "none";


    },3000);



}







/* =====================================================
   RESET FORM
===================================================== */


function resetForm(){

    document.getElementById("batch").value="";
    document.getElementById("imei").value="";
    document.getElementById("price").value="";
    document.getElementById("bonus").value="";
    document.getElementById("status").selectedIndex = 0;

    selectCurrentMonth();

    phoneResult.classList.add("hidden");

}

function selectCurrentMonth() {

    const months = [
        "JAN",
        "FEB",
        "MAR",
        "APR",
        "MAY",
        "JUN",
        "JUL",
        "AUG",
        "SEP",
        "OCT",
        "NOV",
        "DEC"
    ];

    const currentMonth = months[new Date().getMonth()];

    document.getElementById("month").value = currentMonth;

}

const priceInput = document.getElementById("price");

priceInput.addEventListener("input", function () {

    // Keep only digits
    let value = this.value.replace(/\D/g, "");

    // Empty input
    if (value === "") {
        this.value = "";
        return;
    }

    // Add thousands separators
    this.value = Number(value).toLocaleString("en-US");

});

const bonusInput = document.getElementById("bonus");

bonusInput.addEventListener("input", function () {

    let value = this.value.replace(/\D/g, "");

    if (value === "") {
        this.value = "";
        return;
    }

    this.value = Number(value).toLocaleString("en-US");

});

/* =====================================================
   KEYBOARD SHORTCUT

   Press ENTER after IMEI entry
   to search automatically

===================================================== */


document
.getElementById("imei")
.addEventListener("keypress",function(event){


    if(event.key === "Enter"){


        searchButton.click();


    }


});

selectCurrentMonth();

// sbbg code starts here//
const sbbgSearchButton = document.getElementById("sbbgSearch");

const sbbgModel = document.getElementById("sbbgModel");

// a selector option btn sbbg & accessories//
const recordType = document.getElementById("recordType");

const sbbgPartType = document.getElementById("sbbgPartType");

//
// =====================================================
// AUTOMATIC SBBG / BOOK SHEET PREFIX
// =====================================================

const sbbgSheet = document.getElementById("sbbgSheet");

function getSheetPrefix() {

    if (recordType.value === "SBBG") {
        return "SBBG";
    }

    if (recordType.value === "ACCESSORIES") {
        return "BOOK";
    }

    return "";
}


// Automatically add the correct prefix while typing
sbbgSheet.addEventListener("input", function () {

    const prefix =
        getSheetPrefix();

    if (prefix === "") {
        return;
    }

    // Remove any existing SBBG or BOOK prefix
    let number =
        this.value
            .trim()
            .toUpperCase()
            .replace(/^SBBG/, "")
            .replace(/^BOOK/, "");

    // Keep only the sheet number
    number =
        number.replace(/\D/g, "");

    this.value =
        prefix + number;

});
//

// Save the existing SBBG options
const originalSBBGPartTypes =
    Array.from(sbbgPartType.options).map(option => ({
        value: option.value,
        text: option.text
    }));


recordType.addEventListener("change", function () {

    // =====================================================
    // AUTOMATIC SBBG / BOOK SHEET PREFIX
    // =====================================================

    const prefix =
        getSheetPrefix();

    let number =
        sbbgSheet.value
            .trim()
            .toUpperCase()
            .replace(/^SBBG/, "")
            .replace(/^BOOK/, "")
            .replace(/\D/g, "");

    sbbgSheet.value =
        prefix + number;


    // Clear current part type options
    sbbgPartType.innerHTML = "";


    // =====================================================
    // SBBG
    // =====================================================

    if (this.value === "SBBG") {

        originalSBBGPartTypes.forEach(function (optionData) {

            const option =
                document.createElement("option");

            option.value = optionData.value;
            option.textContent = optionData.text;

            sbbgPartType.appendChild(option);

        });

    }


    // =====================================================
    // ACCESSORIES / BOOK
    // =====================================================

    if (this.value === "ACCESSORIES") {

        const accessoryTypes = [
            "COVERS",
            "CHARGERS & SOUNDS",
            "DRIVES & PERIPHERALS",
            "PROTECTORS"
        ];


        accessoryTypes.forEach(function (type) {

            const option =
                document.createElement("option");

            option.value = type;
            option.textContent = type;

            sbbgPartType.appendChild(option);

        });

    }


    // Reset fields that depend on the selected category

    sbbgPartType.selectedIndex = 0;

    sbbgModel.innerHTML = `
        <option value="">
            Select a part
        </option>
    `;

    sbbgModel.disabled = true;

});
// end of selector option btn sbbg & accessories//

const sbbgMonth =document.getElementById("sbbgMonth");

function formatSBBGMoneyInput(input) {

    input.addEventListener("input", function () {

        let value = this.value.replace(/,/g, "");

        if (value === "" || isNaN(value)) {
            this.value = "";
            return;
        }

        this.value =
            Number(value).toLocaleString("en-US");

    });

}

formatSBBGMoneyInput(
    document.getElementById("sbbgActualSellingPrice")
);

sbbgSearchButton.addEventListener("click", async function () {

    const sbbgSheet =
        document.getElementById("sbbgSheet").value.trim();

    const arrivalDate =
        document.getElementById("sbbgBatch").value.trim();

    const partType =
    document.getElementById("sbbgPartType").value.trim();    


    if (sbbgSheet === "" || arrivalDate === "") {

        showToast("Enter SBBG sheet and mini-batch.");

        return;

    }


    sbbgSearchButton.disabled = true;

    sbbgSearchButton.innerText = "SEARCHING...";


    try {

        const result = await apiRequest({

            action: "searchSBBGBatch",

            sbbgSheet: sbbgSheet,

            arrivalDate: arrivalDate,

            partType: partType

        });


        sbbgSearchButton.disabled = false;

        sbbgSearchButton.innerText = "SEARCH MINI-BATCH";


        if (!result.success) {

            sbbgModel.innerHTML = `
                <option value="">
                    Mini-batch not found
                </option>
            `;

            sbbgModel.disabled = true;

            showToast(result.message);

            return;

        }

        // Populate months from the selected mini-batch

            sbbgMonth.innerHTML = `
                <option value="">
                    Select month
                </option>
            `;

if (
    result.data.months &&
    result.data.months.length > 0
) {

    result.data.months.forEach(function (month) {

        const option =
            document.createElement("option");

        option.value = month;

        option.textContent = month;

        sbbgMonth.appendChild(option);

    });
    sbbgMonth.disabled = false;

}


        sbbgModel.innerHTML = `
            <option value="">
                Select a part
            </option>
        `;


        result.data.products.forEach(function (product) {

            const option =
                document.createElement("option");

            option.value = product.name;

            option.textContent = product.name;

            sbbgModel.appendChild(option);

        });


        sbbgModel.disabled = false;

        showToast("Mini-batch found.");


    }

    catch (err) {

        sbbgSearchButton.disabled = false;

        sbbgSearchButton.innerText = "SEARCH MINI-BATCH";

        showToast("Connection error.");

        console.log(err);

    }

});

const sbbgSaveButton =
    document.getElementById("sbbgSave");


sbbgSaveButton.addEventListener("click", async function () {


    const sbbgSheet =
        document.getElementById("sbbgSheet").value.trim();


    const arrivalDate =
        document.getElementById("sbbgBatch").value.trim();


    const partType =
        document.getElementById("sbbgPartType").value.trim();


    const model =
        document.getElementById("sbbgModel").value.trim();


    const quantity =
        document.getElementById("sbbgQuantity").value.trim();


    const monthHeader =
        document.getElementById("sbbgMonth").value;


    const actualSellingPrice =
        document.getElementById("sbbgActualSellingPrice")
        .value
        .replace(/,/g, "")
        .trim();


    // =================================================
    // BASIC VALIDATION
    // =================================================

    if (
        sbbgSheet === "" ||
        arrivalDate === "" ||
        partType === "" ||
        model === "" ||
        quantity === "" ||
        actualSellingPrice === ""
    ) {

        showToast(
            "Complete the sale information first."
        );

        return;

    }


    sbbgSaveButton.disabled = true;

    sbbgSaveButton.innerText = "SAVING...";


    try {


        const transactionId =
    "SBBG-" +
    Date.now() +
    "-" +
    Math.random()
        .toString(36)
        .substring(2, 10);

const result = await apiRequest({
    action: "saveSBBGSale",
    sheetName: sbbgSheet,
    arrivalDate: arrivalDate,
    partType: partType,
    model: model,
    quantity: quantity,
    monthHeader: monthHeader,
    actualSellingPrice: actualSellingPrice,
    transactionId: transactionId
});


        sbbgSaveButton.disabled = false;

        sbbgSaveButton.innerText =
            "RECORD SBBG SALE";


        if (!result.success) {

            showToast(result.message);

            return;

        }


        showToast(
            "SBBG sale recorded successfully ✓"
        );


        // =================================================
        // CLEAR SALE FIELDS AFTER SUCCESSFUL SAVE
        // =================================================

        document.getElementById("sbbgSheet").value = "";

        document.getElementById("sbbgBatch").value = "";

        document.getElementById("sbbgPartType").value = "";


        sbbgModel.innerHTML = `
            <option value="">
                Select a part
            </option>
        `;

        sbbgModel.disabled = true;


        sbbgMonth.innerHTML = `
            <option value="">
                Select month
            </option>
        `;

        sbbgMonth.disabled = true;


        document.getElementById("sbbgQuantity").value = "1";


        document.getElementById(
            "sbbgActualSellingPrice"
        ).value = "";


    }


    catch (err) {


        sbbgSaveButton.disabled = false;

        sbbgSaveButton.innerText =
            "RECORD SBBG SALE";


        showToast(
            "Connection error."
        );


        console.log(err);

    }


});


const dashboardMenu =
    document.getElementById("dashboardMenu");

const recordSaleMenu =
    document.getElementById("recordSaleMenu");

const inventoryMenu =
    document.getElementById("inventoryMenu");

const toolsMenu =
    document.getElementById("toolsMenu");

const dashboardPage =
    document.getElementById("dashboardPage");

const recordSalePage =
    document.getElementById("recordSalePage");

const inventoryPage =
    document.getElementById("inventoryPage");

const invoiceGeneratorPage =
    document.getElementById("invoiceGeneratorPage");

const warrantyGeneratorPage =
    document.getElementById("warrantyGeneratorPage");

const topupCalculatorPage =
    document.getElementById("topupCalculatorPage");


// =====================================================
// DASHBOARD
// =====================================================

dashboardMenu.addEventListener("click", function () {

    dashboardPage.classList.remove("hidden");

    recordSalePage.classList.add("hidden");
    inventoryPage.classList.add("hidden");
    invoiceGeneratorPage.classList.add("hidden");
    warrantyGeneratorPage.classList.add("hidden");
    topupCalculatorPage.classList.add("hidden");

    dashboardMenu.classList.add("active");

    recordSaleMenu.classList.remove("active");
    inventoryMenu.classList.remove("active");
    toolsMenu.classList.remove("active");

});


// =====================================================
// RECORD SALE
// =====================================================

recordSaleMenu.addEventListener("click", function (event) {

    // Don't reset the page when clicking a submenu option
    if (event.target.closest(".record-sale-option")) {
        return;
    }

    dashboardPage.classList.add("hidden");
    recordSalePage.classList.remove("hidden");
    inventoryPage.classList.add("hidden");
    invoiceGeneratorPage.classList.add("hidden");
    warrantyGeneratorPage.classList.add("hidden");
    topupCalculatorPage.classList.add("hidden");

    // Reset Record Sale details to the plain Record Sale page
    normalSaleSection.classList.add("hidden");
    outsourcedSaleSection.classList.add("hidden");
    sbbgSaleSection.classList.add("hidden");

    dashboardMenu.classList.remove("active");
    recordSaleMenu.classList.add("active");
    inventoryMenu.classList.remove("active");

    // Open / close the Record Sale submenu
    const submenu = document.getElementById("recordSaleSubmenu");
    const arrow = document.getElementById("recordSaleArrow");

    submenu.classList.toggle("hidden");

    if (submenu.classList.contains("hidden")) {
        arrow.style.transform = "rotate(0deg)";
    } else {
        arrow.style.transform = "rotate(180deg)";
    }
});

const normalSaleSection = document.getElementById("normalSaleSection");
const outsourcedSaleSection = document.getElementById("outsourcedSaleSection");
const sbbgSaleSection = document.getElementById("sbbgSaleSection");

function showSaleSection(section) {
    normalSaleSection.classList.add("hidden");
    outsourcedSaleSection.classList.add("hidden");
    sbbgSaleSection.classList.add("hidden");

    section.classList.remove("hidden");
}

document.getElementById("inshopSaleOption").addEventListener("click", function () {
    showSaleSection(normalSaleSection);
});

document.getElementById("outsourcedSaleOption").addEventListener("click", function () {
    showSaleSection(outsourcedSaleSection);
});

document.getElementById("sbbgSaleOption").addEventListener("click", function () {
    showSaleSection(sbbgSaleSection);
});


// =====================================================
// INVENTORY
// =====================================================

inventoryMenu.addEventListener("click", function (event) {

    // Don't reset the page when clicking a submenu option
    if (event.target.closest(".inventory-option")) {
        return;
    }

    dashboardPage.classList.add("hidden");
    recordSalePage.classList.add("hidden");
    inventoryPage.classList.remove("hidden");
    invoiceGeneratorPage.classList.add("hidden");
    warrantyGeneratorPage.classList.add("hidden");
    topupCalculatorPage.classList.add("hidden");

    // Reset Inventory details to the plain Inventory page
    inventorySearchSection.classList.add("hidden");
    stockSummarySection.classList.add("hidden");
    restockSection.classList.add("hidden");

    dashboardMenu.classList.remove("active");
    recordSaleMenu.classList.remove("active");
    inventoryMenu.classList.add("active");

    // Open / close the Inventory submenu
    const submenu =
        document.getElementById("inventorySubmenu");

    const arrow =
        document.getElementById("inventoryArrow");

    submenu.classList.toggle("hidden");

    if (submenu.classList.contains("hidden")) {
        arrow.style.transform = "rotate(0deg)";
    } else {
        arrow.style.transform = "rotate(180deg)";
    }

});

const inventorySearchSection =
    document.getElementById("inventorySearchSection");

const stockSummarySection =
    document.getElementById("stockSummarySection");

const restockSection =
    document.getElementById("restockSection");


function showInventorySection(section) {

    inventorySearchSection.classList.add("hidden");
    stockSummarySection.classList.add("hidden");
    restockSection.classList.add("hidden");

    section.classList.remove("hidden");

}


document.getElementById("inventorySearchOption").addEventListener("click", function () {

    showInventorySection(inventorySearchSection);

});


document.getElementById("stockSummaryOption").addEventListener("click", function () {

    showInventorySection(stockSummarySection);

});


document.getElementById("restockOption").addEventListener("click", function () {

    showInventorySection(restockSection);

    loadRestockReport();

});


// =====================================================
// INVENTORY — FIND STOCK
// =====================================================

const inventoryFilterButton =
    document.getElementById("inventoryFilterButton");

const filteredResultsSection =
    document.getElementById("filteredResultsSection");

const filteredResults =
    document.getElementById("filteredResults");


inventoryFilterButton.addEventListener("click", async function () {

    const searchTerm1 =
        document.getElementById("inventorySearch1")
        .value
        .trim();

    const searchTerm2 =
        document.getElementById("inventorySearch2")
        .value
        .trim();


    if (searchTerm1 === "") {

        showToast(
            "Enter an item to search for."
        );

        return;

    }


    inventoryFilterButton.disabled = true;

    inventoryFilterButton.innerText =
        "SEARCHING...";


    try {

        const result = await apiRequest({

            action: "searchInventory",

            searchTerm1: searchTerm1,

            searchTerm2: searchTerm2

        });


        inventoryFilterButton.disabled = false;

        inventoryFilterButton.innerText =
            "FIND STOCK";


        if (!result.success) {

            filteredResultsSection
                .classList.add("hidden");

            showToast(result.message);

            return;

        }


        filteredResults.innerHTML = "";


        if (
            !result.data.results ||
            result.data.results.length === 0
        ) {

            filteredResults.innerHTML = `
                <p>
                    No matching stock found.
                </p>
            `;

            filteredResultsSection
                .classList.remove("hidden");

            return;

        }


        // =====================================================
// // =====================================================
// CREATE INVENTORY RESULTS TABLE
// USING ACTUAL SHEET HEADERS
// =====================================================

filteredResults.innerHTML = "";


if (
    !result.data.results ||
    result.data.results.length === 0
) {

    filteredResults.innerHTML = `
        <div class="inventory-no-results">
            No matching stock found.
        </div>
    `;

    filteredResultsSection
        .classList.remove("hidden");

    return;

}


// =====================================================
// TABLE WRAPPER
// =====================================================

const wrapper =
    document.createElement("div");

wrapper.className =
    "inventory-results-wrapper";


// =====================================================
// TABLE
// =====================================================

const table =
    document.createElement("table");

table.className =
    "inventory-results-table";


// =====================================================
// DETERMINE HEADERS
// =====================================================

// Use the headers from the first matching sheet.

const originalHeaders =
    result.data.results[0].headers || [];


// We add these two because they do not belong
// to the merchandise row itself.

const headers = [
    "SHEET",
    "ROW",
    ...originalHeaders
];


// =====================================================
// HEADER ROW
// =====================================================

const headerRow =
    document.createElement("tr");


headers.forEach(function (header) {

    const th =
        document.createElement("th");


    th.textContent =
        header;


    headerRow.appendChild(th);

});


table.appendChild(headerRow);


// =====================================================
// RESULTS
// =====================================================

result.data.results.forEach(function (item) {

    const row =
        document.createElement("tr");


    // =================================================
    // SHEET + ROW
    // =================================================

    const extraValues = [

        item.sheetName,

        item.rowNumber

    ];


    extraValues.forEach(function (value) {

        const td =
            document.createElement("td");

        td.textContent =
            value;

        row.appendChild(td);

    });


    // =================================================
    // ORIGINAL SHEET ROW
    // =================================================

    const data =
        item.data || [];


    data.forEach(function (value, index) {

        const td =
            document.createElement("td");


        td.textContent =
            value || "";


        row.appendChild(td);

    });


    table.appendChild(row);

});


// =====================================================
// ADD TABLE
// =====================================================

wrapper.appendChild(table);

filteredResults.appendChild(wrapper);


// =====================================================
// RESULT COUNT
// =====================================================

const resultCount =
    document.createElement("div");

resultCount.className =
    "inventory-result-count";

resultCount.textContent =
    result.data.count +
    " matching item(s) found.";


filteredResults.appendChild(resultCount);


// =====================================================
// SHOW RESULTS
// =====================================================

filteredResultsSection
    .classList.remove("hidden");


showToast(
    result.data.count +
    " matching item(s) found."
);


    }

    catch (err) {

        inventoryFilterButton.disabled = false;

        inventoryFilterButton.innerText =
            "FIND STOCK";


        showToast(
            "Connection error."
        );


        console.log(err);

    }

});

// =====================================================
// STOCK SUMMARY
// =====================================================

const stockSummaryButton =
    document.getElementById("stockSummaryButton");

const stockSummary =
    document.getElementById("stockSummary");


stockSummaryButton.addEventListener(
    "click",
    async function () {


        // =============================================
        // LOADING STATE
        // =============================================

        stockSummaryButton.disabled = true;

        stockSummaryButton.innerText =
            "UPDATING...";


        stockSummary.innerHTML = `
            <div class="inventory-loading">
                Updating stock summary...
            </div>
        `;


        try {


            // =========================================
            // REQUEST
            // =========================================

            const result =
                await apiRequest({

                    action:
                        "stockSummary"

                });


            // =========================================
            // RESTORE BUTTON
            // =========================================

            stockSummaryButton.disabled =
                false;

            stockSummaryButton.innerText =
                "UPDATE STOCK SUMMARY";


            // =========================================
            // ERROR
            // =========================================

            if (!result.success) {

                stockSummary.innerHTML = `
                    <div class="inventory-no-results">
                        ${result.message}
                    </div>
                `;

                showToast(
                    result.message
                );

                return;

            }


            // =========================================
            // NO RESULTS
            // =========================================

            if (
                !result.data.results ||
                result.data.results.length === 0
            ) {

                stockSummary.innerHTML = `
                    <div class="inventory-no-results">
                        No stock found.
                    </div>
                `;

                return;

            }


            // =====================================================
// CLEAR OLD RESULTS
// =====================================================

stockSummary.innerHTML = "";


// =====================================================
// GENERAL MERCHANDISE STOCK SUMMARY
// PHONES / LAPTOPS / WATCHES / SPEAKERS ETC.
// =====================================================

const generalWrapper =
    document.createElement("div");

generalWrapper.className =
    "inventory-results-wrapper";


const generalTable =
    document.createElement("table");

generalTable.className =
    "inventory-results-table";


// HEADER

const generalHeaderRow =
    document.createElement("tr");


const generalItemHeader =
    document.createElement("th");

generalItemHeader.textContent =
    "ITEM";


const generalCountHeader =
    document.createElement("th");

generalCountHeader.textContent =
    "AVAILABLE";


generalHeaderRow.appendChild(
    generalItemHeader
);

generalHeaderRow.appendChild(
    generalCountHeader
);

generalTable.appendChild(
    generalHeaderRow
);


// RESULTS

(result.data.results || []).forEach(
    function (item) {

        const row =
            document.createElement("tr");


        const itemCell =
            document.createElement("td");

        itemCell.textContent =
            item.item;


        const countCell =
            document.createElement("td");

        countCell.textContent =
            item.count;


        row.appendChild(
            itemCell
        );

        row.appendChild(
            countCell
        );


        generalTable.appendChild(
            row
        );

    }
);


generalWrapper.appendChild(
    generalTable
);

stockSummary.appendChild(
    generalWrapper
);


// =====================================================
// SBBG / BOOK STOCK SUMMARY
// =====================================================

const sbbgBookResults =
    (result.data.sbbgBookResults || []).filter(function (item) {

        return Number(item.available) > 0;

    });


const sbbgTitle =
    document.createElement("h3");

sbbgTitle.textContent =
    "SBBG / BOOK STOCK";

sbbgTitle.style.marginTop =
    "25px";

stockSummary.appendChild(
    sbbgTitle
);


// TABLE WRAPPER

const sbbgWrapper =
    document.createElement("div");

sbbgWrapper.className =
    "inventory-results-wrapper";


// TABLE

const sbbgTable =
    document.createElement("table");

sbbgTable.className =
    "inventory-results-table sbbg-book-stock-table";


// HEADER

const sbbgHeaderRow =
    document.createElement("tr");


const sheetHeader =
    document.createElement("th");

sheetHeader.textContent =
    "SHEET";


const miniBatchHeader =
    document.createElement("th");

miniBatchHeader.textContent =
    "MINI-BATCH";


const partTypeHeader =
    document.createElement("th");

partTypeHeader.textContent =
    "PART TYPE";


const modelHeader =
    document.createElement("th");

modelHeader.textContent =
    "ITEM";


const liveStockHeader =
    document.createElement("th");

liveStockHeader.textContent =
    "LIVE STOCK";


sbbgHeaderRow.appendChild(
    sheetHeader
);

sbbgHeaderRow.appendChild(
    miniBatchHeader
);

sbbgHeaderRow.appendChild(
    partTypeHeader
);

sbbgHeaderRow.appendChild(
    modelHeader
);

sbbgHeaderRow.appendChild(
    liveStockHeader
);

sbbgTable.appendChild(
    sbbgHeaderRow
);


// RESULTS

sbbgBookResults.forEach(
    function (item) {

        const row =
            document.createElement("tr");


        const sheetCell =
            document.createElement("td");

        sheetCell.textContent =
            item.sheetName;


        const miniBatchCell =
            document.createElement("td");

        miniBatchCell.textContent =
            item.miniBatch;


        const partTypeCell =
            document.createElement("td");

        partTypeCell.textContent =
            item.partType;


        const modelCell =
            document.createElement("td");

        modelCell.textContent =
            item.model;


        const liveStockCell =
            document.createElement("td");

        liveStockCell.textContent =
            item.available;


        row.appendChild(
            sheetCell
        );

        row.appendChild(
            miniBatchCell
        );

        row.appendChild(
            partTypeCell
        );

        row.appendChild(
            modelCell
        );

        row.appendChild(
            liveStockCell
        );


        sbbgTable.appendChild(
            row
        );

    }
);


sbbgWrapper.appendChild(
    sbbgTable
);

stockSummary.appendChild(
    sbbgWrapper
);


            // =========================================
            // COUNT
            // =========================================

            const resultCount =
                document.createElement("div");

            resultCount.className =
                "inventory-result-count";

            resultCount.textContent =
                result.data.count +
                " merchandise item(s).";


            stockSummary.appendChild(
                resultCount
            );


            showToast(
                "Stock summary updated."
            );


        }

        catch (err) {


            stockSummaryButton.disabled =
                false;

            stockSummaryButton.innerText =
                "UPDATE STOCK SUMMARY";


            stockSummary.innerHTML = `
                <div class="inventory-no-results">
                    Connection error.
                </div>
            `;


            showToast(
                "Connection error."
            );


            console.log(err);

        }

    }
);

// =====================================================
// RESTOCK
// =====================================================

const restockResults =
    document.getElementById("restockResults");

const restockRefreshButton =
    document.getElementById("restockRefreshButton");


// =====================================================
// LOAD RESTOCK REPORT
// =====================================================

async function loadRestockReport() {

    // =============================================
    // BUTTON STATE
    // =============================================

    if (restockRefreshButton) {

        restockRefreshButton.disabled = true;

        restockRefreshButton.innerText =
            "UPDATING...";

    }


    restockResults.innerHTML = `
        <div class="inventory-loading">
            Checking stock levels...
        </div>
    `;


    try {

        // =============================================
        // GET RESTOCK REPORT
        // =============================================

        const result =
            await apiRequest({

                action:
                    "restockReport"

            });


        // =============================================
        // ERROR
        // =============================================

        if (!result.success) {

            restockResults.innerHTML = `
                <div class="inventory-no-results">
                    ${result.message}
                </div>
            `;

            return;

        }


        // =============================================
        // DATA
        // =============================================

        const normalResults =
            result.data.results || [];

        const sbbgBookResults =
            result.data.sbbgBookResults || [];


        // =============================================
        // CLEAR OLD RESULTS
        // =============================================

        restockResults.innerHTML = "";


        // =====================================================
        // NORMAL MERCHANDISE TABLE
        // PHONES / LAPTOPS / WATCHES / SPEAKERS ETC.
        // =====================================================

        if (normalResults.length > 0) {

            const normalTitle =
                document.createElement("h3");

            normalTitle.textContent =
                "GENERAL MERCHANDISE";

            restockResults.appendChild(
                normalTitle
            );


            // =============================================
            // CALCULATE PRIORITY
            // =============================================

            const results =
                normalResults.map(function (item) {

                    const available =
                        Number(item.available) || 0;

                    const target =
                        Number(item.target) || 0;

                    const restock =
                        Number(item.restock) || 0;


                    let priority;
                    let priorityClass;
                    let priorityOrder;


                    const shortagePercentage =
                        target > 0
                            ? (restock / target) * 100
                            : 0;


                    if (shortagePercentage >= 75) {

                        priority = "CRITICAL";
                        priorityClass = "critical";
                        priorityOrder = 1;

                    }

                    else if (shortagePercentage >= 50) {

                        priority = "HIGH";
                        priorityClass = "high";
                        priorityOrder = 2;

                    }

                    else {

                        priority = "MODERATE";
                        priorityClass = "moderate";
                        priorityOrder = 3;

                    }


                    return {

                        ...item,

                        available,
                        target,
                        restock,

                        priority,
                        priorityClass,
                        priorityOrder

                    };

                });


            // =============================================
            // SORT
            // =============================================

            results.sort(function (a, b) {

                if (
                    a.priorityOrder !==
                    b.priorityOrder
                ) {

                    return (
                        a.priorityOrder -
                        b.priorityOrder
                    );

                }

                return b.restock - a.restock;

            });


            // =============================================
            // TABLE
            // =============================================

            const wrapper =
                document.createElement("div");

            wrapper.className =
                "restock-results-wrapper";


            const table =
                document.createElement("table");

            table.className =
                 "restock-results-table";

            const headerRow =
                document.createElement("tr");


            const headers = [
                "ITEM",
                "PHYSICAL",
                "I/T",
                "TARGET",
                "RESTOCK",
                "PRIORITY"
            ];


            headers.forEach(function (header) {

                const th =
                    document.createElement("th");

                th.textContent =
                    header;

                headerRow.appendChild(th);

            });


            table.appendChild(headerRow);


            results.forEach(function (item) {

                const row =
                    document.createElement("tr");


                const itemCell =
                    document.createElement("td");

                itemCell.textContent =
                    item.item;

                row.appendChild(itemCell);


                const availableCell =
                    document.createElement("td");

                availableCell.textContent =
                    item.available;

                row.appendChild(availableCell);

                const inTransitCell =
                    document.createElement("td");

                inTransitCell.textContent =
                    item.inTransit || 0;

                row.appendChild(inTransitCell);


                const targetCell =
                    document.createElement("td");

                targetCell.textContent =
                    item.target;

                row.appendChild(targetCell);


                const restockCell =
                    document.createElement("td");

                restockCell.textContent =
                    item.restock;

                restockCell.className =
                    "restock-quantity";

                row.appendChild(restockCell);


                const priorityCell =
                    document.createElement("td");

                priorityCell.textContent =
                    item.priority;

                priorityCell.className =
                    "restock-priority " +
                    item.priorityClass;

                row.appendChild(priorityCell);


                table.appendChild(row);

            });


            wrapper.appendChild(table);

            restockResults.appendChild(wrapper);


            const normalCount =
                document.createElement("div");

            normalCount.className =
                "inventory-result-count";

            normalCount.textContent =
                normalResults.length +
                " general merchandise item(s) need restocking.";

            restockResults.appendChild(
                normalCount
            );

        }


        // =====================================================
        // SBBG / BOOK TABLE
        // KEPT COMPLETELY SEPARATE
        // =====================================================

        if (sbbgBookResults.length > 0) {

            const sbbgTitle =
                document.createElement("h3");

            sbbgTitle.textContent =
                "SBBG / BOOK RESTOCK";

            restockResults.appendChild(
                sbbgTitle
            );


            const wrapper =
                document.createElement("div");

            wrapper.className =
                "restock-results-wrapper";


            const table =
                document.createElement("table");

            table.className =
                "restock-results-table sbbg-book-table";

            // =============================================
            // HEADER
            // =============================================

            const headerRow =
                document.createElement("tr");


            const headers = [

                "SHEET",
                "MINI-BATCH",
                "PART TYPE",
                "ITEM",
                "LIVE STOCK",
                "ACTION"

            ];


            headers.forEach(function (header) {

                const th =
                    document.createElement("th");

                th.textContent =
                    header;

                headerRow.appendChild(th);

            });


            table.appendChild(headerRow);


            // =============================================
            // RESULTS
            // =============================================

            sbbgBookResults.forEach(function (item) {

    const row =
        document.createElement("tr");


    // =============================================
    // SHEET
    // =============================================

    const sheetCell =
        document.createElement("td");

    sheetCell.textContent =
        item.sheetName || "";

    row.appendChild(sheetCell);


    // =============================================
    // MINI-BATCH
    // =============================================

    const miniBatchCell =
        document.createElement("td");

    miniBatchCell.textContent =
        item.miniBatch || "";

    row.appendChild(miniBatchCell);


    // =============================================
    // PART TYPE
    // =============================================

    const partTypeCell =
        document.createElement("td");

    partTypeCell.textContent =
        item.partType || "";

    row.appendChild(partTypeCell);


    // =============================================
    // ITEM
    // =============================================

    const itemCell =
        document.createElement("td");

    itemCell.textContent =
        item.model || "";

    row.appendChild(itemCell);


    // =============================================
    // LIVE STOCK
    // =============================================

    const liveStockCell =
        document.createElement("td");

    liveStockCell.textContent =
        item.available ?? "";

    row.appendChild(liveStockCell);


    // =============================================
    // RESTOCKED BUTTON
    // =============================================

    const actionCell =
        document.createElement("td");

    const restockedButton =
        document.createElement("button");

    restockedButton.textContent =
        "RESTOCKED";

    restockedButton.addEventListener(
        "click",
        async function () {

            if (
                !confirm(
                    "Mark this item as restocked?\n\n" +
                    item.sheetName + "\n" +
                    item.miniBatch + "\n" +
                    item.partType + "\n" +
                    item.model
                )
            ) {
                return;
            }

            restockedButton.disabled = true;

            restockedButton.textContent =
                "SAVING...";

            try {

                const result =
                    await apiRequest({

                        action:
                            "markSBBGRestocked",

                        sheetName:
                            item.sheetName,

                        miniBatch:
                            item.miniBatch,

                        partType:
                            item.partType,

                        model:
                            item.model

                    });


                if (!result.success) {

                    showToast(
                        result.message
                    );

                    restockedButton.disabled =
                        false;

                    restockedButton.textContent =
                        "RESTOCKED";

                    return;
                }


                showToast(
                    "Item marked as restocked ✓"
                );


               

            }

            catch (err) {

                console.log(err);

                showToast(
                    "Failed to mark item as restocked."
                );

                restockedButton.disabled =
                    false;

                restockedButton.textContent =
                    "RESTOCKED";

            }

        }
    );

    actionCell.appendChild(
        restockedButton
    );

    row.appendChild(actionCell);


    table.appendChild(row);

});


            wrapper.appendChild(table);

            restockResults.appendChild(wrapper);


            // =============================================
            // RESULT COUNT
            // =============================================

            const sbbgCount =
                document.createElement("div");

            sbbgCount.className =
                "inventory-result-count";

            sbbgCount.textContent =
                sbbgBookResults.length +
                " SBBG / BOOK item(s) need restocking.";

            restockResults.appendChild(
                sbbgCount
            );

        }


        // =====================================================
        // NOTHING NEEDS RESTOCKING
        // =====================================================

        if (
            normalResults.length === 0 &&
            sbbgBookResults.length === 0
        ) {

            restockResults.innerHTML = `
                <div class="inventory-no-results">
                    All stocked items are currently
                    at or above their target levels.
                </div>
            `;

        }

    }


    catch (err) {

        restockResults.innerHTML = `
            <div class="inventory-no-results">
                Connection error.
            </div>
        `;

        console.log(err);

    }


    finally {

        // =============================================
        // RESTORE BUTTON
        // =============================================

        if (restockRefreshButton) {

            restockRefreshButton.disabled = false;

            restockRefreshButton.innerText =
                "UPDATE RESTOCK";

        }

    }

}
// =====================================================
// MANUAL REFRESH BUTTON
// =====================================================

if (restockRefreshButton) {

    restockRefreshButton.addEventListener(
        "click",
        loadRestockReport
    );

}


// =====================================================
// INITIAL LOAD
// =====================================================



// =====================================================
// OUTSOURCED MERCHANDISE SALE
// =====================================================


// =====================================================
// AUTOMATIC DATE
// =====================================================

function selectCurrentOutsourcedDate() {

    const dateInput =
        document.getElementById("outsourcedDate");

    if (!dateInput) {
        return;
    }

    const today = new Date();

    const year =
        today.getFullYear();

    const month =
        String(today.getMonth() + 1)
        .padStart(2, "0");

    const day =
        String(today.getDate())
        .padStart(2, "0");

    dateInput.value =
        year + "-" + month + "-" + day;
}


// =====================================================
// FORMAT MONEY INPUT
// =====================================================

function formatOutsourcedMoney(input) {

    if (!input) {
        return;
    }

    input.addEventListener("input", function () {

        let value =
            this.value.replace(/\D/g, "");

        if (value === "") {

            this.value = "";

            return;
        }

        this.value =
            Number(value).toLocaleString("en-US");

    });
}


// =====================================================
// MONEY INPUTS
// =====================================================

const outsourcedCostInput =
    document.getElementById(
        "outsourcedCost"
    );

const outsourcedBonusInput =
    document.getElementById(
        "outsourcedBonus"
    );

const outsourcedSellingPriceInput =
    document.getElementById(
        "outsourcedSellingPrice"
    );


formatOutsourcedMoney(
    outsourcedCostInput
);

formatOutsourcedMoney(
    outsourcedBonusInput
);

formatOutsourcedMoney(
    outsourcedSellingPriceInput
);


// =====================================================
// RECORD OUTSOURCED SALE
// =====================================================

const outsourcedSaveButton =
    document.getElementById(
        "outsourcedSaveButton"
    );


if (outsourcedSaveButton) {

    outsourcedSaveButton.addEventListener(
        "click",
        async function () {

            const saleDate =
                document
                    .getElementById(
                        "outsourcedDate"
                    )
                    .value;

            const product =
                document
                    .getElementById(
                        "outsourcedProduct"
                    )
                    .value
                    .trim();

            const color =
                document
                    .getElementById(
                        "outsourcedColor"
                    )
                    .value
                    .trim();

            const imeiSerial =
                document
                    .getElementById(
                        "outsourcedImei"
                    )
                    .value
                    .trim();

            const supplier =
                document
                    .getElementById(
                        "outsourcedSupplier"
                    )
                    .value
                    .trim();

            const cost =
                document
                    .getElementById(
                        "outsourcedCost"
                    )
                    .value
                    .replace(/,/g, "")
                    .trim();

            const bonus =
                document
                    .getElementById(
                        "outsourcedBonus"
                    )
                    .value
                    .replace(/,/g, "")
                    .trim();

            const sellingPrice =
                document
                    .getElementById(
                        "outsourcedSellingPrice"
                    )
                    .value
                    .replace(/,/g, "")
                    .trim();


            // =================================================
            // VALIDATION
            // =================================================

            if (
                saleDate === "" ||
                product === "" ||
                supplier === "" ||
                cost === "" ||
                sellingPrice === ""
            ) {

                showToast(
                    "Complete the outsourced sale information first."
                );

                return;
            }


            // =================================================
            // CONFIRMATION
            // =================================================

            if (
                !confirm(
                    "Confirm recording this outsourced sale?"
                )
            ) {

                return;
            }


            outsourcedSaveButton.disabled =
                true;

            outsourcedSaveButton.innerText =
                "SAVING...";


            try {

                const transactionId =
    "OUTSOURCED-" +
    Date.now() +
    "-" +
    Math.random()
        .toString(36)
        .substring(2, 10);

const result =
    await apiRequest({
        action:
            "saveOutsourcedSale",
        saleDate:
            saleDate,
        product:
            product,
        color:
            color,
        imeiSerial:
            imeiSerial,
        supplier:
            supplier,
        cost:
            cost,
        bonus:
            bonus,
        sellingPrice:
            sellingPrice,
        transactionId:
            transactionId
    });


                outsourcedSaveButton.disabled =
                    false;

                outsourcedSaveButton.innerText =
                    "RECORD OUTSOURCED SALE";


                if (!result.success) {

                    showToast(
                        result.message
                    );

                    return;
                }


                showToast(
                    "Outsourced sale recorded successfully ✓"
                );


                // =================================================
                // CLEAR FORM
                // =================================================

                document
                    .getElementById(
                        "outsourcedProduct"
                    )
                    .value = "";

                document
                    .getElementById(
                        "outsourcedColor"
                    )
                    .value = "";

                document
                    .getElementById(
                        "outsourcedImei"
                    )
                    .value = "";

                document
                    .getElementById(
                        "outsourcedSupplier"
                    )
                    .value = "";

                document
                    .getElementById(
                        "outsourcedCost"
                    )
                    .value = "";

                document
                    .getElementById(
                        "outsourcedBonus"
                    )
                    .value = "";

                document
                    .getElementById(
                        "outsourcedSellingPrice"
                    )
                    .value = "";


                // Reset date to today's date
                selectCurrentOutsourcedDate();

            }


            catch (err) {

                outsourcedSaveButton.disabled =
                    false;

                outsourcedSaveButton.innerText =
                    "RECORD OUTSOURCED SALE";

                console.log(err);

                showToast(
                    "Connection error."
                );

            }

        }
    );

}


// =====================================================
// SET INITIAL DATE
// =====================================================

selectCurrentOutsourcedDate();

// =====================================================
// TOOLS
// =====================================================

// =====================================================
// TOOLS
// =====================================================

toolsMenu.addEventListener("click", function (event) {

    // Don't toggle the menu when clicking a submenu option
    if (event.target.closest(".tools-option")) {
        return;
    }

    dashboardPage.classList.add("hidden");
    recordSalePage.classList.add("hidden");
    inventoryPage.classList.add("hidden");

    invoiceGeneratorPage.classList.add("hidden");
    warrantyGeneratorPage.classList.add("hidden");
    topupCalculatorPage.classList.add("hidden");

    dashboardMenu.classList.remove("active");
    recordSaleMenu.classList.remove("active");
    inventoryMenu.classList.remove("active");
    toolsMenu.classList.add("active");

    // Open / close the Tools submenu
    const submenu =
        document.getElementById("toolsSubmenu");

    const arrow =
        document.getElementById("toolsArrow");

    submenu.classList.toggle("hidden");

    if (submenu.classList.contains("hidden")) {
        arrow.style.transform = "rotate(0deg)";
    } else {
        arrow.style.transform = "rotate(180deg)";
    }

});
// =====================================================
// INVOICE GENERATOR
// =====================================================

const invoiceGeneratorOption =
    document.getElementById("invoiceGeneratorOption");

invoiceGeneratorOption.addEventListener("click", function () {

    dashboardPage.classList.add("hidden");
    recordSalePage.classList.add("hidden");
    inventoryPage.classList.add("hidden");
    topupCalculatorPage.classList.add("hidden");
    warrantyGeneratorPage.classList.add("hidden");
    invoiceGeneratorPage.classList.remove("hidden");

    dashboardMenu.classList.remove("active");
    recordSaleMenu.classList.remove("active");
    inventoryMenu.classList.remove("active");
    toolsMenu.classList.add("active");

    selectNextInvoiceNumber();

});

// =====================================================
// INVOICE PRODUCTS
// =====================================================

const invoiceProducts =
    document.getElementById("invoiceProducts");

const addInvoiceProduct =
    document.getElementById("addInvoiceProduct");


addInvoiceProduct.addEventListener("click", function () {

    const currentRows =
        invoiceProducts.querySelectorAll(
            ".invoice-product-row"
        ).length;


    // Maximum of 6 products
    if (currentRows >= 6) {

        showToast(
            "Maximum of 6 products per invoice."
        );

        return;
    }


    const row =
        document.createElement("div");

    row.className =
        "invoice-product-row";


    row.innerHTML = `

    <div class="invoice-description-block">

        <div class="form-group">

            <label>
                Product Name
            </label>

            <input
                type="text"
                class="invoice-description"
                placeholder="Example: HP ELITEBOOK x360 1040 G8"
            >

        </div>


        <div class="form-group">

            <label>
                Additional Description (Optional)
            </label>

            <textarea
                class="invoice-additional-description"
                rows="2"
                placeholder="Example: 512G SSD + 16G RAM&#10;Core i7-11th Gen"
            ></textarea>

        </div>

    </div>


    <div class="form-group">

        <label>
            Unit Price
        </label>

        <input
            type="text"
            class="invoice-unit-price"
            placeholder="0"
            inputmode="numeric"
            autocomplete="off"
        >

    </div>


    <div class="form-group">

        <label>
            QTY
        </label>

        <input
            type="number"
            class="invoice-quantity"
            min="1"
            value="1"
        >

    </div>

`;

    invoiceProducts.appendChild(row);

    formatInvoiceMoneyInput(
    row.querySelector(".invoice-unit-price")
);

});

// =====================================================
// GENERATE INVOICE
// =====================================================

const generateInvoiceButton =
    document.getElementById("generateInvoiceButton");


generateInvoiceButton.addEventListener("click", async function () {

    // =================================================
    // GET INVOICE INFORMATION
    // =================================================

    const customerName =
        document.getElementById("invoiceCustomerName").value.trim();

    const customerPhone =
        document.getElementById("invoiceCustomerPhone").value.trim();

    const customerTIN =
        document.getElementById("invoiceCustomerTIN").value.trim();

    const customerVRN =
        document.getElementById("invoiceCustomerVRN").value.trim();

    const customerAddress =
        document.getElementById("invoiceCustomerAddress").value.trim();

    const shippingAddress =
        document.getElementById("invoiceShippingAddress").value.trim();

    const invoiceNumber =
        document.getElementById("invoiceNumber").value.trim();

    const invoiceDate =
        document.getElementById("invoiceDate").value;

    const invoicePO =
        document.getElementById("invoicePO").value.trim();

    const invoiceDueDate =
        document.getElementById("invoiceDueDate").value;

    const vat =
        document.getElementById("invoiceVAT").value;

    const paymentInfo =
        document.getElementById("invoicePaymentInfo").value.trim();


    // =================================================
    // GET PRODUCTS
    // =================================================

    const productRows =
        document.querySelectorAll(
            "#invoiceProducts .invoice-product-row"
        );

    const products = [];


    productRows.forEach(function (row) {

        const description =
            row.querySelector(
                ".invoice-description"
            ).value.trim();

        const unitPrice =
            row.querySelector(
                ".invoice-unit-price"
            ).value
            .replace(/,/g, "")
            .trim();

        const quantity =
            row.querySelector(
                ".invoice-quantity"
            ).value.trim();


        // Ignore completely empty product rows
        if (
            description === "" &&
            unitPrice === "" &&
            quantity === ""
        ) {
            return;
        }


        products.push({
            description: description,
            additionalDescription:
                row.querySelector(
                    ".invoice-additional-description"
                ).value.trim(),
            unitPrice: unitPrice,
            quantity: quantity
        });

    });


    // =================================================
    // VALIDATION
    // =================================================

    if (
        customerName === "" ||
        invoiceNumber === "" ||
        invoiceDate === ""
    ) {

        showToast(
            "Complete the customer name, invoice number and invoice date."
        );

        return;
    }


    if (products.length === 0) {

        showToast(
            "Add at least one product."
        );

        return;
    }


    for (let i = 0; i < products.length; i++) {

        if (
            products[i].description === "" ||
            products[i].unitPrice === "" ||
            products[i].quantity === ""
        ) {

            showToast(
                "Complete all fields for each product."
            );

            return;
        }

    }


    // =================================================
    // GENERATING
    // =================================================

    generateInvoiceButton.disabled = true;

    generateInvoiceButton.innerText =
        "GENERATING...";


    try {

        const result =
            await apiRequest({

                action: "generateInvoice",

                customerName:
                    customerName,

                customerPhone:
                    customerPhone,

                customerTIN:
                    customerTIN,

                customerVRN:
                    customerVRN,

                customerAddress:
                    customerAddress,

                shippingAddress:
                    shippingAddress,

                invoiceNumber:
                    invoiceNumber,

                invoiceDate:
                    invoiceDate,

                invoicePO:
                    invoicePO,

                invoiceDueDate:
                    invoiceDueDate,

                vat:
                    vat,

                paymentInfo:
                    paymentInfo,

                products:
                    products

            });


        // =================================================
        // RESET BUTTON
        // =================================================

        generateInvoiceButton.disabled = false;

        generateInvoiceButton.innerText =
            "GENERATE INVOICE";


        // =================================================
        // CHECK RESULT
        // =================================================

        if (!result.success) {

            showToast(
                result.message ||
                "Invoice generation failed."
            );

            return;
        }


        // =================================================
        // DOWNLOAD PDF
        // =================================================

        const binary =
            atob(result.data.pdf);

        const bytes =
            new Uint8Array(
                binary.length
            );


        for (
            let i = 0;
            i < binary.length;
            i++
        ) {

            bytes[i] =
                binary.charCodeAt(i);

        }


        const pdfBlob =
            new Blob(
                [bytes],
                {
                    type: "application/pdf"
                }
            );


        const downloadUrl =
            URL.createObjectURL(pdfBlob);


        const downloadLink =
            document.createElement("a");

        downloadLink.href =
            downloadUrl;

        downloadLink.download =
            result.data.fileName ||
            "Invoice.pdf";


        document.body.appendChild(
            downloadLink
        );

        downloadLink.click();

        downloadLink.remove();


        URL.revokeObjectURL(
            downloadUrl
        );


        showToast(
            "Invoice generated successfully ✓"
        );


    }
    catch (err) {

        generateInvoiceButton.disabled =
            false;

        generateInvoiceButton.innerText =
            "GENERATE INVOICE";

        console.log(err);

        showToast(
            "Connection error."
        );

    }

});
// =====================================================
// INVOICE DEFAULTS
// =====================================================

function selectCurrentInvoiceDate() {

    const dateInput =
        document.getElementById("invoiceDate");

    if (!dateInput) {
        return;
    }

    const today =
        new Date();

    const year =
        today.getFullYear();

    const month =
        String(today.getMonth() + 1)
        .padStart(2, "0");

    const day =
        String(today.getDate())
        .padStart(2, "0");

    dateInput.value =
        year + "-" + month + "-" + day;
}


// Set today's date when the page loads
selectCurrentInvoiceDate();


// =====================================================
// AUTOMATIC INVOICE NUMBER
// =====================================================

async function selectNextInvoiceNumber() {

    const invoiceNumberInput =
        document.getElementById("invoiceNumber");

    if (!invoiceNumberInput) {
        return;
    }

    invoiceNumberInput.value =
        "Generating...";

    try {

        const result =
            await apiRequest({
                action:
                    "generateInvoiceNumber"
            });

        if (
            !result.success ||
            !result.data ||
            !result.data.invoiceNumber
        ) {

            invoiceNumberInput.value = "";

            showToast(
                result.message ||
                "Could not generate invoice number."
            );

            return;
        }

        invoiceNumberInput.value =
            result.data.invoiceNumber;

    } catch (err) {

        invoiceNumberInput.value = "";

        console.log(err);

        showToast(
            "Could not generate invoice number."
        );

    }

}
// =====================================================
// INVOICE UNIT PRICE FORMATTING
// =====================================================

function formatInvoiceMoneyInput(input) {

    if (!input) {
        return;
    }

    input.addEventListener("input", function () {

        let value =
            this.value.replace(/\D/g, "");

        if (value === "") {

            this.value = "";

            return;
        }

        this.value =
            Number(value)
                .toLocaleString("en-US");

    });

}
document
    .querySelectorAll(".invoice-unit-price")
    .forEach(function (input) {

        formatInvoiceMoneyInput(input);

    });
    // =====================================================
// WARRANTY GENERATOR
// =====================================================

const warrantyGeneratorOption =
    document.getElementById(
        "warrantyGeneratorOption"
    );

warrantyGeneratorOption.addEventListener(
    "click",
    function () {

        dashboardPage.classList.add("hidden");
        recordSalePage.classList.add("hidden");
        inventoryPage.classList.add("hidden");
        invoiceGeneratorPage.classList.add("hidden");
        topupCalculatorPage.classList.add("hidden");
        warrantyGeneratorPage.classList.remove("hidden");

        dashboardMenu.classList.remove("active");
        recordSaleMenu.classList.remove("active");
        inventoryMenu.classList.remove("active");
        toolsMenu.classList.add("active");

    }
);

// =====================================================
// WARRANTY GENERATOR
// =====================================================

document
    .getElementById("generateWarrantyButton")
    .addEventListener("click", async function () {

        const clientName =
            document
                .getElementById("warrantyClientName")
                .value
                .trim();

        const clientPhone =
            document
                .getElementById("warrantyClientPhone")
                .value
                .trim();

        const clientAddress =
            document
                .getElementById("warrantyClientAddress")
                .value
                .trim();

        const purchaseDate =
            document
                .getElementById("warrantyPurchaseDate")
                .value;

        const modelName =
            document
                .getElementById("warrantyModel")
                .value
                .trim();

        const serialImei =
            document
                .getElementById("warrantySerial")
                .value
                .trim();


        // Validate required fields
        if (
            !clientName ||
            !clientPhone ||
            !clientAddress ||
            !purchaseDate ||
            !modelName ||
            !serialImei
        ) {

            showToast(
                "Please fill in all warranty fields."
            );

            return;
        }


        try {

            const response =
                await fetch(
                    API_URL,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/x-www-form-urlencoded"
                        },

                        body:
                            "payload=" +
                            encodeURIComponent(
                                JSON.stringify({
                                    action:
                                        "generateWarranty",

                                    data: {
                                        clientName:
                                            clientName,

                                        clientPhone:
                                            clientPhone,

                                        clientAddress:
                                            clientAddress,

                                        purchaseDate:
                                            purchaseDate,

                                        modelName:
                                            modelName,

                                        serialImei:
                                            serialImei
                                    }
                                })
                            )
                    }
                );


            const result =
                await response.json();


            if (!result.success) {

                showToast(
                    result.message ||
                    "Failed to generate warranty."
                );

                return;
            }


            // Convert Base64 PDF to downloadable file
            const byteCharacters =
                atob(result.data.pdf);

            const byteNumbers =
                new Array(
                    byteCharacters.length
                );

            for (
                let i = 0;
                i < byteCharacters.length;
                i++
            ) {
                byteNumbers[i] =
                    byteCharacters.charCodeAt(i);
            }

            const byteArray =
                new Uint8Array(byteNumbers);

            const blob =
                new Blob(
                    [byteArray],
                    {
                        type:
                            "application/pdf"
                    }
                );


            const url =
                URL.createObjectURL(blob);


            const link =
                document.createElement("a");

            link.href = url;

            link.download =
                result.data.fileName ||
                "Warranty.pdf";

            document.body.appendChild(link);

            link.click();

            link.remove();

            URL.revokeObjectURL(url);


            showToast(
                "Warranty generated successfully."
            );


        } catch (error) {

            console.error(
                "Warranty generation error:",
                error
            );

            showToast(
                "Unable to generate warranty."
            );

        }

    });
    // =====================================================
// TOPUP CALCULATOR
// =====================================================

const topupCalculatorOption =
    document.getElementById("topupCalculatorOption");

    // =====================================================
// RESET TOPUP CALCULATOR
// =====================================================

function resetTopUpCalculator() {

    // Customer phone
    topupPhoneModel.value = "";
    topupPhoneStorage.innerHTML = `
        <option value="">
            Select model first
        </option>
    `;
    topupPhoneStorage.disabled = true;

    // Current asking price
    topupCurrentAP.value = "";

    // Clear manual old-phone fields
    topupOldPhoneManualModel.value = "";
    topupOldPhoneManualStorage.value = "";
    topupOldPhoneManualGroup.classList.add("hidden");

    // Phone conditions
    document.getElementById("topupBackglass").checked = false;
    document.getElementById("topupBatteryService").checked = false;
    document.getElementById("topupBatteryReplaced").checked = false;
    document.getElementById("topupDisplayReplaced").checked = false;
    document.getElementById("topupScreenReplacement").checked = false;
    document.getElementById("topupFaceID").checked = false;

    // New phone
    topupNewPhoneModel.value = "";

    topupNewPhoneStorage.innerHTML = `
        <option value="">
            Select model first
        </option>
    `;

    topupNewPhoneStorage.disabled = true;

    topupNewPhoneAP.value = "";

    // New phone manual AP
    topupNewPhoneManualModel.value = "";
    topupNewPhoneManualStorage.value = "";
    topupNewPhoneManualAP.value = "";

    topupNewPhoneManualModelGroup.classList.add("hidden");
    topupNewPhoneManualAPGroup.classList.add("hidden");

    // Hide previous calculation
    document
        .getElementById("topupCalculationResult")
        .classList.add("hidden");

    // Clear previous calculation content
    document
        .getElementById("topupResultContent")
        .innerHTML = "";
}

topupCalculatorOption.addEventListener(
    "click",
    async function () {

        resetTopUpCalculator();

        dashboardPage.classList.add("hidden");
        recordSalePage.classList.add("hidden");
        inventoryPage.classList.add("hidden");

        invoiceGeneratorPage.classList.add("hidden");
        warrantyGeneratorPage.classList.add("hidden");

        topupCalculatorPage.classList.remove("hidden");

        await loadTopUpPhoneModels();

        loadTopUpNewPhoneModels();
    }
);
// =====================================================
// TOPUP CALCULATOR — PHONE MODEL & STORAGE
// =====================================================

const topupPhoneModel =
    document.getElementById("topupPhoneModel");

const topupPhoneStorage =
    document.getElementById("topupPhoneStorage");

    const topupOldPhoneManualGroup =
    document.getElementById(
        "topupOldPhoneManualGroup"
    );

const topupOldPhoneManualModel =
    document.getElementById(
        "topupOldPhoneManualModel"
    );

const topupOldPhoneManualStorage =
    document.getElementById(
        "topupOldPhoneManualStorage"
    );

let topUpPhoneModels = [];


// =====================================================
// LOAD PHONE MODELS
// =====================================================

async function loadTopUpPhoneModels() {

    topupPhoneModel.innerHTML = `
        <option value="">
            Loading models...
        </option>
    `;

    topupPhoneModel.disabled = true;

    topupPhoneStorage.innerHTML = `
        <option value="">
            Select model first
        </option>
    `;

    topupPhoneStorage.disabled = true;

    try {

        const result = await apiRequest({
            action: "getTopUpPhoneModelOptions"
        });


        if (!result.success) {

            topupPhoneModel.innerHTML = `
                <option value="">
                    Unable to load models
                </option>
            `;

            showToast(result.message);

            return;
        }


        topUpPhoneModels =
            result.data.models || [];


        topupPhoneModel.innerHTML = `
            <option value="">
                Select phone model
            </option>
        `;


        topUpPhoneModels.forEach(function (model) {

            const option =
                document.createElement("option");

            // Internal value
            option.value =
                model.modelCode;

            // Friendly name shown to user
            option.textContent =
                model.modelName;

            topupPhoneModel.appendChild(option);

        });
        const manualOption =
    document.createElement("option");

        manualOption.value =
            "__MANUAL__";

        manualOption.textContent =
            "Device not listed";

        topupPhoneModel.appendChild(
            manualOption
        );


        topupPhoneModel.disabled = false;


    } catch (err) {

        console.log(err);

        topupPhoneModel.innerHTML = `
            <option value="">
                Unable to load models
            </option>
        `;

        showToast("Connection error.");

    }

}


// =====================================================
// MODEL CHANGE → LOAD STORAGE
// =====================================================

topupPhoneModel.addEventListener(
    "change",
    function () {

        const selectedModelCode =
            this.value;

        // =====================================================
// MANUAL / UNLISTED DEVICE
// =====================================================

if (
    selectedModelCode === "__MANUAL__"
) {

    topupPhoneStorage.innerHTML = `
        <option value="">
            Not required
        </option>
    `;

    topupPhoneStorage.disabled =
        true;

    topupOldPhoneManualGroup
        .classList.remove("hidden");

    topupCurrentAP.value = "";

    topupCurrentAP.readOnly = false;

    topupCurrentAP.placeholder =
        "Enter asking price manually";

    return;
}


// =====================================================
// NORMAL DEVICE
// =====================================================

topupOldPhoneManualGroup
    .classList.add("hidden");

topupOldPhoneManualModel.value = "";
topupOldPhoneManualStorage.value = "";

topupCurrentAP.readOnly = true;

topupCurrentAP.placeholder =
    "Will be fetched automatically";    


        topupPhoneStorage.innerHTML = `
            <option value="">
                Select storage
            </option>
        `;

        topupPhoneStorage.disabled = true;


        if (selectedModelCode === "") {
            return;
        }


        const selectedModel =
            topUpPhoneModels.find(
                function (model) {
                    return (
                        model.modelCode ===
                        selectedModelCode
                    );
                }
            );


        if (!selectedModel) {
            return;
        }


        selectedModel.storages.forEach(
            function (storage) {

                const option =
                    document.createElement("option");

                option.value =
                    storage;

                option.textContent =
                    storage;

                topupPhoneStorage.appendChild(
                    option
                );

            }
        );


        topupPhoneStorage.disabled = false;

    }
);

// =====================================================
// TOPUP CALCULATOR — FETCH CURRENT ASKING PRICE
// =====================================================

const topupCurrentAP =
    document.getElementById("topupCurrentAP");


async function loadTopUpPhoneAP() {

    const modelCode =
        topupPhoneModel.value;

    const storage =
        topupPhoneStorage.value;


    // Nothing selected yet
    if (
        modelCode === "" ||
        storage === ""
    ) {

        topupCurrentAP.value = "";

        return;
    }


    // Backend uses format such as:
    // 15PM(256G)

    const searchModel =
        modelCode + "(" + storage + ")";


    topupCurrentAP.value =
        "Fetching...";


    try {

        const result =
            await apiRequest({
                action: "findTopUpPhoneAP",
                model: searchModel
            });


        if (!result.success) {

            topupCurrentAP.value = "";

            showToast(
                result.message ||
                "Current asking price was not found."
            );

            return;
        }


        const askingPrice =
            Number(
                result.data.askingPrice
            );


        topupCurrentAP.value =
            askingPrice.toLocaleString(
                "en-US"
            );

    } catch (err) {

        console.log(err);

        topupCurrentAP.value = "";

        showToast(
            "Unable to fetch asking price."
        );

    }

}
topupPhoneStorage.addEventListener(
    "change",
    async function () {

        await loadTopUpPhoneAP();

    }
);
// =====================================================
// TOPUP CALCULATOR — PHONE YEAR & DEPRECIATION
// =====================================================

let topUpPhoneYearInfo = null;


async function loadTopUpPhoneYearInfo() {

    const modelCode =
        topupPhoneModel.value;

    const storage =
        topupPhoneStorage.value;


    if (
        modelCode === "" ||
        storage === ""
    ) {
        topUpPhoneYearInfo = null;
        return;
    }


    const searchModel =
        modelCode + "(" + storage + ")";


    try {

        const result =
            await apiRequest({
                action: "getTopUpPhoneYearInfo",
                model: searchModel
            });


        if (!result.success) {

            topUpPhoneYearInfo = null;

            showToast(
                result.message ||
                "Unable to determine phone age."
            );

            return;
        }


        topUpPhoneYearInfo =
            result.data;


        console.log(
            "Topup phone year info:",
            topUpPhoneYearInfo
        );


    } catch (err) {

        console.log(err);

        topUpPhoneYearInfo = null;

        showToast(
            "Unable to fetch phone year information."
        );

    }

}
// =====================================================
// TOPUP CALCULATOR — PHONE CONDITIONS
// =====================================================

function getTopUpConditions() {

    return {

        backglass:
            document.getElementById("topupBackglass").checked,

        batteryService:
            document.getElementById("topupBatteryService").checked,

        batteryReplaced:
            document.getElementById("topupBatteryReplaced").checked,

        displayReplaced:
            document.getElementById("topupDisplayReplaced").checked,

        screenReplacement:
            document.getElementById("topupScreenReplacement").checked,

        faceID:
            document.getElementById("topupFaceID").checked

    };

}
// =====================================================
// TOPUP CALCULATOR — CALCULATE FINAL TOP-UP
// =====================================================

const topupCalculateButton =
    document.getElementById(
        "topupCalculateButton"
    );


topupCalculateButton.addEventListener(
    "click",
    async function () {

        // =================================================
        // OLD PHONE
        // =================================================

       const oldModelCode =
    topupPhoneModel.value;


let oldPhoneModel = "";
let oldPhoneManualAP = null;


// =================================================
// MANUAL / UNLISTED OLD PHONE
// =================================================

if (
    oldModelCode === "__MANUAL__"
) {

    let manualModel =
        topupOldPhoneManualModel.value
            .trim()
            .toUpperCase();

    let manualStorage =
        topupOldPhoneManualStorage.value
            .trim()
            .toUpperCase();

    const manualAP =
        topupCurrentAP.value
            .replace(/,/g, "")
            .trim();


    // Remove "IPHONE" if user typed it
    manualModel =
        manualModel
            .replace(/^IPHONE\s*/, "")
            .replace(/\s+/g, "");


    // Normalize storage
    manualStorage =
        manualStorage
            .replace(/\s+/g, "")
            .replace(/GB$/, "G");


    if (
        manualModel === "" ||
        manualStorage === ""
    ) {

        showToast(
            "Please enter the customer's phone model and storage."
        );

        return;

    }


    if (
        manualAP === "" ||
        isNaN(Number(manualAP))
    ) {

        showToast(
            "Please enter the customer's phone asking price."
        );

        return;

    }


    oldPhoneModel =
        manualModel +
        "(" +
        manualStorage +
        ")";

    oldPhoneManualAP =
        Number(manualAP);

}


// =================================================
// NORMAL OLD PHONE
// =================================================

else {

    const oldStorage =
        topupPhoneStorage.value;


    if (
        oldModelCode === "" ||
        oldStorage === ""
    ) {

        showToast(
            "Please select the customer's phone model and storage."
        );

        return;

    }


    oldPhoneModel =
        oldModelCode +
        "(" +
        oldStorage +
        ")";

}


        // =================================================
        // NEW PHONE
        // =================================================

        const newModelCode =
    topupNewPhoneModel.value;


let newPhoneModel = "";
let newPhoneManualAP = null;


// =================================================
// MANUAL / UNLISTED NEW PHONE
// =================================================

if (
    newModelCode === "__MANUAL__"
) {

    let manualModel =
        topupNewPhoneManualModel.value
            .trim()
            .toUpperCase();

    let manualStorage =
        topupNewPhoneManualStorage.value
            .trim()
            .toUpperCase();

    const manualAP =
        topupNewPhoneManualAP.value
            .replace(/,/g, "")
            .trim();


    // Remove "IPHONE" if user typed it

    manualModel =
        manualModel
            .replace(/^IPHONE\s*/, "")
            .replace(/\s+/g, "");


    // Normalize storage

    manualStorage =
        manualStorage
            .replace(/\s+/g, "")
            .replace(/GB$/, "G");


    if (
        manualModel === "" ||
        manualStorage === ""
    ) {

        showToast(
            "Please enter the new phone model and storage."
        );

        return;

    }


    if (
        manualAP === "" ||
        isNaN(Number(manualAP))
    ) {

        showToast(
            "Please enter the new phone asking price."
        );

        return;

    }


    newPhoneModel =
        manualModel +
        "(" +
        manualStorage +
        ")";

    newPhoneManualAP =
        Number(manualAP);

}


// =================================================
// NORMAL NEW PHONE
// =================================================

else {

    const newStorage =
        topupNewPhoneStorage.value;


    if (
        newModelCode === "" ||
        newStorage === ""
    ) {

        showToast(
            "Please select the new phone model and storage."
        );

        return;

    }


    newPhoneModel =
        newModelCode +
        "(" +
        newStorage +
        ")";


    // Existing manual AP, used when automatic AP
    // cannot be found for a listed model

    newPhoneManualAP =
        topupNewPhoneManualAP.value
            .trim();

}


        // =================================================
        // CONDITIONS
        // =================================================

        const oldPhoneConditions =
            getTopUpConditions();


       


        // =================================================
        // CALCULATE
        // =================================================

        topupCalculateButton.disabled =
            true;

        topupCalculateButton.textContent =
            "Calculating...";


        try {

            const result =
                await apiRequest({

                    action:
                        "calculateTopUpWithManualAP",

                    oldPhoneModel:
                        oldPhoneModel,

                    oldPhoneConditions:
                        oldPhoneConditions,

                    oldPhoneManualAP:
                        oldPhoneManualAP,

                    newPhoneModel:
                        newPhoneModel,

                    newPhoneManualAP:
                        newPhoneManualAP

                });


            console.log(
                "Complete Topup Calculation:",
                result
            );


            if (!result.success) {

                showToast(
                    result.message ||
                    "Unable to calculate top-up."
                );

                return;

            }


            // =================================================
            // RESULT DATA
            // =================================================

            const data =
                result.data;

            const oldPhone =
                data.oldPhone;

            const newPhone =
                data.newPhone;


            // =================================================
            // DEDUCTIONS
            // =================================================

            let deductionsHTML = "";


            if (
                oldPhone.deductions &&
                oldPhone.deductions.length > 0
            ) {

                deductionsHTML =
                    oldPhone.deductions
                        .map(
                            function (deduction) {

                                return `
                                    <div>
                                        <span>
                                            ${deduction.condition}
                                        </span>

                                        <span>
                                            - TSh ${Number(
                                                deduction.amount
                                            ).toLocaleString("en-US")}
                                        </span>
                                    </div>
                                `;

                            }
                        )
                        .join("");

            }


            if (
                deductionsHTML === ""
            ) {

                deductionsHTML = `
                    <div>
                        <span>
                            No condition deductions
                        </span>

                        <span>
                            TSh 0
                        </span>
                    </div>
                `;

            }


            // =================================================
            // DISPLAY RESULT
            // =================================================

            const resultCard =
                document.getElementById(
                    "topupCalculationResult"
                );

            const resultContent =
                document.getElementById(
                    "topupResultContent"
                );


            resultContent.innerHTML = `

                <div class="topup-result-summary">

                    <div>
                        <span>Customer's Phone</span>

                        <strong>
                            ${oldPhone.model}
                        </strong>
                    </div>


                    <div>
                        <span>Current Asking Price</span>

                        <strong>
                            TSh ${Number(
                                oldPhone.askingPrice
                            ).toLocaleString("en-US")}
                        </strong>
                    </div>


                    <div>
                        <span>Phone Age</span>

                        <strong>
                            ${oldPhone.age}
                            year${oldPhone.age === 1 ? "" : "s"}
                        </strong>
                    </div>


                    <div>
                        <span>Depreciation</span>

                        <strong>
                            ${oldPhone.depreciationPercent}%
                        </strong>
                    </div>

                </div>


                <div class="topup-result-deductions">

                    <h4>Deductions</h4>

                    ${deductionsHTML}

                </div>


                <div class="topup-result-final">

                    <span>Resale Value</span>

                    <strong>
                        TSh ${Number(
                            oldPhone.finalValue
                        ).toLocaleString("en-US")}
                    </strong>

                </div>


                <hr>


                <div class="topup-result-summary">

                    <div>
                        <span>New Phone</span>

                        <strong>
                            ${newPhone.model}
                        </strong>
                    </div>


                    <div>
                        <span>New Phone Asking Price</span>

                        <strong>
                            TSh ${Number(
                                newPhone.askingPrice
                            ).toLocaleString("en-US")}
                        </strong>
                    </div>

                </div>


                <div class="topup-result-final">

                    <span>Final Top-Up Value</span>

                    <strong>
                        TSh ${Number(
                            data.topUpAmount
                        ).toLocaleString("en-US")}
                    </strong>

                </div>

            `;


            resultCard.classList.remove(
                "hidden"
            );


            console.log(
                "RESALE VALUE:",
                oldPhone.finalValue
            );

            console.log(
                "NEW PHONE AP:",
                newPhone.askingPrice
            );

            console.log(
                "FINAL TOP-UP:",
                data.topUpAmount
            );


        } catch (err) {

            console.log(err);

            showToast(
                "Unable to calculate top-up."
            );

        } finally {

            topupCalculateButton.disabled =
                false;

            topupCalculateButton.textContent =
                "Calculate Top-Up Value";

        }

    }
);
// =====================================================
// TOPUP CALCULATOR — NEW PHONE
// =====================================================

const topupNewPhoneModel =
    document.getElementById(
        "topupNewPhoneModel"
    );

const topupNewPhoneStorage =
    document.getElementById(
        "topupNewPhoneStorage"
    );
    const topupNewPhoneManualModelGroup =
    document.getElementById(
        "topupNewPhoneManualModelGroup"
    );

const topupNewPhoneManualModel =
    document.getElementById(
        "topupNewPhoneManualModel"
    );

const topupNewPhoneManualStorage =
    document.getElementById(
        "topupNewPhoneManualStorage"
    );

const topupNewPhoneAP =
    document.getElementById(
        "topupNewPhoneAP"
    );

const topupNewPhoneManualAPGroup =
    document.getElementById(
        "topupNewPhoneManualAPGroup"
    );

const topupNewPhoneManualAP =
    document.getElementById(
        "topupNewPhoneManualAP"
    );


// =====================================================
// LOAD NEW PHONE MODELS
// =====================================================

function loadTopUpNewPhoneModels() {

    topupNewPhoneModel.innerHTML = `
        <option value="">
            Select phone model
        </option>
    `;

    topUpPhoneModels.forEach(
        function (model) {

            const option =
                document.createElement("option");

            option.value =
                model.modelCode;

            option.textContent =
                model.modelName;

            topupNewPhoneModel.appendChild(
                option
            );

        }
    );

        const manualOption =
        document.createElement("option");

    manualOption.value =
        "__MANUAL__";

    manualOption.textContent =
        "Device not listed";

    topupNewPhoneModel.appendChild(
        manualOption
    );

}
// =====================================================
// NEW MODEL CHANGE → LOAD STORAGE
// =====================================================

topupNewPhoneModel.addEventListener(
    "change",
    function () {

        const selectedModelCode =
            this.value;

            // =====================================================
// MANUAL / UNLISTED NEW PHONE
// =====================================================

if (
    selectedModelCode === "__MANUAL__"
) {

    topupNewPhoneStorage.innerHTML = `
        <option value="">
            Not required
        </option>
    `;

    topupNewPhoneStorage.disabled =
        true;

    topupNewPhoneManualModelGroup
        .classList.remove("hidden");

    topupNewPhoneManualModel.value = "";
    topupNewPhoneManualStorage.value = "";

    topupNewPhoneAP.value = "";

    topupNewPhoneManualAP.value = "";

    topupNewPhoneManualAPGroup
        .classList.remove("hidden");

    return;
}


// =====================================================
// NORMAL NEW PHONE
// =====================================================

topupNewPhoneManualModelGroup
    .classList.add("hidden");

topupNewPhoneManualModel.value = "";
topupNewPhoneManualStorage.value = "";


        topupNewPhoneStorage.innerHTML = `
            <option value="">
                Select storage
            </option>
        `;

        topupNewPhoneStorage.disabled =
            true;


        topupNewPhoneAP.value = "";

        topupNewPhoneManualAP.value = "";

        topupNewPhoneManualAPGroup
            .classList.add("hidden");


        if (
            selectedModelCode === ""
        ) {
            return;
        }


        const selectedModel =
            topUpPhoneModels.find(
                function (model) {

                    return (
                        model.modelCode ===
                        selectedModelCode
                    );

                }
            );


        if (!selectedModel) {
            return;
        }


        selectedModel.storages.forEach(
            function (storage) {

                const option =
                    document.createElement("option");

                option.value =
                    storage;

                option.textContent =
                    storage;

                topupNewPhoneStorage.appendChild(
                    option
                );

            }
        );


        topupNewPhoneStorage.disabled =
            false;

    }
);
// =====================================================
// NEW STORAGE CHANGE → FETCH AP
// =====================================================

topupNewPhoneStorage.addEventListener(
    "change",
    async function () {

        const modelCode =
            topupNewPhoneModel.value;

        const storage =
            this.value;


        topupNewPhoneAP.value = "";

        topupNewPhoneManualAP.value = "";

        topupNewPhoneManualAPGroup
            .classList.add("hidden");


        if (
            modelCode === "" ||
            storage === ""
        ) {
            return;
        }


        const searchModel =
            modelCode +
            "(" +
            storage +
            ")";


        topupNewPhoneAP.value =
            "Fetching...";


        try {

            const result =
                await apiRequest({

                    action:
                        "findTopUpPhoneAP",

                    model:
                        searchModel

                });


            if (
                result.success
            ) {

                topupNewPhoneAP.value =
                    Number(
                        result.data.askingPrice
                    ).toLocaleString(
                        "en-US"
                    );

                return;

            }


            // =============================================
            // AP NOT FOUND → MANUAL INPUT
            // =============================================

            topupNewPhoneAP.value =
                "Not found";


            topupNewPhoneManualAPGroup
                .classList.remove("hidden");


        } catch (err) {

            console.log(err);

            topupNewPhoneAP.value =
                "Not found";


            topupNewPhoneManualAPGroup
                .classList.remove("hidden");

        }

    }
);
