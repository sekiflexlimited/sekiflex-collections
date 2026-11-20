
document.addEventListener("DOMContentLoaded", async () => {
  // SEKIFLEX COLLECTIONS — STAFF AND CUSTOMER SYSTEM

  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".main-nav");

  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.textContent = open ? "×" : "☰";
    });
  }

  // SUPABASE CONNECTION

  let db = null;

  if (
    window.supabase &&
    window.SEKIFLEX_SUPABASE_URL &&
    window.SEKIFLEX_SUPABASE_KEY
  ) {
    db = window.supabase.createClient(
      window.SEKIFLEX_SUPABASE_URL,
      window.SEKIFLEX_SUPABASE_KEY
    );
  }

  function showMessage(element, message, type = "info") {
    if (!element) return;

    const colors = {
      success: "#16803c",
      error: "#c62828",
      info: "#1769aa"
    };

    element.textContent = message;
    element.style.color = colors[type] || colors.info;
    element.style.fontWeight = "600";
  }

  function getStatusColor(value) {
    const status = String(value || "").toLowerCase();

    if (
      status.includes("delayed") ||
      status.includes("returned") ||
      status.includes("attempted") ||
      status.includes("awaiting payment")
    ) return "#D93636";

    if (
      status.includes("delivered") ||
      status.includes("ready for collection") ||
      status.includes("payment confirmed")
    ) return "#239B59";

    return "#D6A500";
  }

  function addDetail(container, label, value) {
    if (value === null || value === undefined || value === "") return;

    const p = document.createElement("p");
    p.style.margin = "7px 0";
    p.style.fontSize = "14px";
    p.style.overflowWrap = "anywhere";

    const strong = document.createElement("strong");
    strong.textContent = label + ": ";

    const text = document.createElement("span");
    text.textContent = String(value);

    if (
      label === "Customer status" ||
      label === "Shipment status"
    ) {
      text.style.color = getStatusColor(value);
      text.style.fontWeight = "700";
    }

    p.append(strong, text);
    container.appendChild(p);
  }

  function getErrorDetails(error) {
    return [
      error?.message,
      error?.details,
      error?.hint,
      error?.code
    ].filter(Boolean).join(" | ") || "Unknown database error";
  }

  function getEstimatedDeliveryDate(days) {
    const numberOfDays = Number(days);

    if (
      !Number.isInteger(numberOfDays) ||
      numberOfDays < 1 ||
      numberOfDays > 7
    ) {
      throw new Error(
        "Please select an estimated delivery time from 1 to 7 days."
      );
    }

    const date = new Date();
    date.setDate(date.getDate() + numberOfDays);

    const y = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${y}-${month}-${day}`;
  }

  // INSTRUCTION TEXT COLOURS

  const instructionColors = {
    Yellow: "#FFD700",
    Red: "#FF0000",
    Green: "#008000"
  };

  function safeInstructionColor(value) {
    const selected = String(value || "").trim().toLowerCase();

    for (const [name, hex] of Object.entries(instructionColors)) {
      if (
        selected === name.toLowerCase() ||
        selected === hex.toLowerCase()
      ) {
        return hex;
      }
    }

    return instructionColors.Yellow;
  }

  function getInstructionColorName(value) {
    const color = safeInstructionColor(value);

    return Object.keys(instructionColors).find(
      name => instructionColors[name] === color
    ) || "Yellow";
  }

  // CUSTOMER TRACKING INSTRUCTIONS
  // Plain text only: no boxes, backgrounds or extra headings.

  function renderInstruction(result, message, color) {
    if (!message || !String(message).trim()) return;

    const paragraph = document.createElement("p");
    paragraph.textContent = message;
    paragraph.style.color = safeInstructionColor(color);
    paragraph.style.whiteSpace = "pre-wrap";
    paragraph.style.overflowWrap = "anywhere";
    paragraph.style.margin = "7px 0";
    paragraph.style.fontSize = "14px";
    paragraph.style.lineHeight = "1.6";

    result.appendChild(paragraph);
  }

  // CUSTOMER TRACKING

  const trackingForm = document.getElementById("tracking-form");

  if (trackingForm) {
    trackingForm.addEventListener("submit", async event => {
      event.preventDefault();

      const number = document
        .getElementById("tracking-number")
        .value.trim()
        .toUpperCase();

      const phone = document
        .getElementById("phone-last4")
        .value.trim();

      const message = document.getElementById("tracking-message");
      const result = document.getElementById("tracking-result");
      const button = trackingForm.querySelector('button[type="submit"]');

      result.replaceChildren();

      if (!/^SC-\d{4}-\d{6}$/.test(number)) {
        showMessage(
          message,
          "Please enter a valid SC tracking number.",
          "error"
        );
        return;
      }

      if (!/^\d{4}$/.test(phone)) {
        showMessage(
          message,
          "Please enter the last four digits of your registered phone number.",
          "error"
        );
        return;
      }

      if (!db) {
        showMessage(message, "Tracking service is unavailable.", "error");
        return;
      }

      button.disabled = true;
      showMessage(message, "Checking shipment...", "info");

      try {
        const { data, error } = await db.rpc(
          "track_sekiflex_order_v2",
          {
            p_tracking_number: number,
            p_phone_last4: phone
          }
        );

        if (error) throw error;

        const shipment = Array.isArray(data) ? data[0] : data;

        if (!shipment) {
          showMessage(
            message,
            "No shipment found. Please check your details.",
            "error"
          );
          return;
        }

        showMessage(
          message,
          "Shipment information found.",
          "success"
        );

        const heading = document.createElement("h2");
        heading.textContent = "Shipment details";
        result.appendChild(heading);

        addDetail(result, "Tracking number", shipment.tracking_number);
        addDetail(result, "Customer status", shipment.status);
        addDetail(result, "Payment status", shipment.payment_status);
        addDetail(result, "Country", shipment.country);
        addDetail(result, "Destination", shipment.destination);
        addDetail(result, "Currency", shipment.currency);

        if (shipment.order_amount != null) {
          addDetail(
            result,
            "Order amount",
            `${shipment.currency || ""} ${shipment.order_amount}`
          );
        }

        if (shipment.delivery_amount != null) {
          addDetail(
            result,
            "Delivery amount",
            `${shipment.currency || ""} ${shipment.delivery_amount}`
          );
        }

        addDetail(result, "Courier", shipment.courier_name);
        addDetail(result, "Courier waybill", shipment.courier_waybill);
        addDetail(result, "Estimated delivery", shipment.estimated_delivery);

        renderInstruction(
          result,
          shipment.collection_instructions,
          shipment.collection_text_color
        );

        renderInstruction(
          result,
          shipment.delivery_instructions,
          shipment.delivery_text_color
        );

        if (shipment.updated_at) {
          const updated = document.createElement("small");
          updated.textContent =
            "Last updated: " +
            new Date(shipment.updated_at).toLocaleString();

          result.appendChild(updated);
        }

      } catch (error) {
        console.error("Tracking error:", error);

        showMessage(
          message,
          "Tracking failed: " + getErrorDetails(error),
          "error"
        );

      } finally {
        button.disabled = false;
      }
    });
  }

  // STAFF DASHBOARD

  const loginSection = document.getElementById("admin-login");
  const dashboard = document.getElementById("admin-dashboard");

  if (!loginSection || !dashboard) return;

  const loginForm = document.getElementById("admin-login-form");
  const loginMessage = document.getElementById("login-message");
  const logoutButton = document.getElementById("admin-logout");
  const orderForm = document.getElementById("order-form");
  const orderMessage = document.getElementById("order-message");
  const ordersList = document.getElementById("orders-list");
  const searchInput = document.getElementById("order-search");
  const refreshButton = document.getElementById("refresh-orders");

  const statuses = [
    "Order processing",
    "Package being packed",
    "Package packed and prepared",
    "Awaiting dispatch",
    "Dispatched / handed to courier",
    "In transit",
    "Arrived at destination facility",
    "Ready for collection",
    "Out for delivery",
    "Delivered",
    "Delivery delayed",
    "Delivery attempted",
    "Returned to sender"
  ];

  const paymentStatuses = [
    "Awaiting payment",
    "Payment confirmed"
  ];

  let currentOrders = [];

  function setDashboardVisible(visible) {
    loginSection.hidden = visible;
    dashboard.hidden = !visible;
  }

  // VERIFY STAFF ACCESS

  async function verifyStaff(user) {
    const { data, error } = await db
      .from("staff_members")
      .select("role, active")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Staff verification error:", error);
      return false;
    }

    return Boolean(data && data.active === true);
  }

  async function enterDashboard(user) {
    const authorized = await verifyStaff(user);

    if (!authorized) {
      await db.auth.signOut();
      setDashboardVisible(false);

      showMessage(
        loginMessage,
        "This account is not authorized to access the staff dashboard.",
        "error"
      );

      return;
    }

    setDashboardVisible(true);
    await loadOrders();
  }

  // STAFF LOGIN

  if (loginForm) {
    loginForm.addEventListener("submit", async event => {
      event.preventDefault();

      if (!db) {
        showMessage(
          loginMessage,
          "Database connection unavailable.",
          "error"
        );
        return;
      }

      const email = document.getElementById("admin-email").value.trim();
      const password = document.getElementById("admin-password").value;
      const button = loginForm.querySelector('button[type="submit"]');

      button.disabled = true;
      showMessage(loginMessage, "Signing in securely...", "info");

      try {
        const { data, error } = await db.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;

        await enterDashboard(data.user);

      } catch (error) {
        console.error("Login error:", error);

        showMessage(
          loginMessage,
          "Sign-in failed. Check your email and password.",
          "error"
        );

      } finally {
        button.disabled = false;
      }
    });
  }

  // LOAD ORDERS AND STATISTICS

  async function loadOrders() {
    if (!db) return;

    ordersList.textContent = "Loading orders...";

    const { data, error } = await db
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Orders loading error:", error);
      ordersList.textContent = "Could not load orders.";
      return;
    }

    currentOrders = data || [];

    const total = document.getElementById("stat-total");
    const payment = document.getElementById("stat-payment");
    const transit = document.getElementById("stat-transit");
    const delivered = document.getElementById("stat-delivered");

    if (total) total.textContent = currentOrders.length;

    if (payment) {
      payment.textContent = currentOrders.filter(
        order => order.payment_status === "Awaiting payment"
      ).length;
    }

    if (transit) {
      transit.textContent = currentOrders.filter(
        order => order.status === "In transit"
      ).length;
    }

    if (delivered) {
      delivered.textContent = currentOrders.filter(
        order => order.status === "Delivered"
      ).length;
    }

    renderOrders();
  }

  // FORM CONTROL HELPERS

  function makeSelect(options, selectedValue) {
    const select = document.createElement("select");

    select.style.display = "block";
    select.style.width = "100%";
    select.style.marginTop = "8px";
    select.style.minHeight = "44px";
    select.style.padding = "8px";
    select.style.borderRadius = "8px";
    select.style.boxSizing = "border-box";

    options.forEach(value => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });

    if (selectedValue && !options.includes(selectedValue)) {
      const option = document.createElement("option");
      option.value = selectedValue;
      option.textContent = selectedValue;
      select.appendChild(option);
    }

    select.value = selectedValue || options[0];
    return select;
  }

  function makeLabel(text) {
    const label = document.createElement("label");
    label.textContent = text;
    label.style.display = "block";
    label.style.marginTop = "12px";
    label.style.fontSize = "13px";
    label.style.fontWeight = "600";
    return label;
  }

  function makeTextarea(value, placeholder) {
    const textarea = document.createElement("textarea");
    textarea.value = value || "";
    textarea.placeholder = placeholder;
    textarea.rows = 4;
    textarea.style.display = "block";
    textarea.style.width = "100%";
    textarea.style.boxSizing = "border-box";
    textarea.style.padding = "10px";
    textarea.style.marginTop = "7px";
    textarea.style.borderRadius = "8px";
    textarea.style.minHeight = "90px";
    textarea.style.resize = "vertical";
    return textarea;
  }

  function makeSaveButton(text) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = text;
    button.style.width = "100%";
    button.style.marginTop = "15px";
    button.style.padding = "13px";
    button.style.border = "none";
    button.style.borderRadius = "8px";
    button.style.background = "#D4AF37";
    button.style.color = "#17191D";
    button.style.fontWeight = "700";
    button.style.cursor = "pointer";
    return button;
  }

  function makeInstructionColorSelect(value) {
    const select = makeSelect(
      ["Yellow", "Red", "Green"],
      getInstructionColorName(value)
    );

    return select;
  }

  // SAVE ORDER STATUS, PAYMENT AND INSTRUCTIONS


async function saveOrderChanges(order, changes, button, message) {
  button.disabled = true;
  button.textContent = "Saving...";

  const statusChanged =
    Object.prototype.hasOwnProperty.call(changes, "status") &&
    changes.status !== order.status;

  try {
    const { error } = await db
      .from("orders")
      .update(changes)
      .eq("id", order.id);

    if (error) throw error;

    await loadOrders();

    showMessage(message, "Changes saved successfully.", "success");

    if (statusChanged) {
      try {
        const { data, error: notificationError } =
          await db.functions.invoke("sekiflex-order-notifications", {
            body: {
              order_id: order.id,
              event_type: "status_updated",
                        },
            headers: {
              Authorization: `Bearer ${(await db.auth.getSession()).data.session?.access_token}`
            }
          });
          

        if (notificationError || data?.error) {
          console.error(
            "Customer notification error:",
            notificationError || data.error
          );

          showMessage(
            message,
            "Order saved, but the customer email could not be sent. Please check the notification setup.",
            "error"
          );
        } else if (data?.message?.includes("no email address")) {
          showMessage(
            message,
            "Order saved, but this customer has no email address.",
            "success"
          );
        } else {
          showMessage(
            message,
            "Changes saved successfully. Customer email notification sent.",
            "success"
          );
        }
      } catch (notificationError) {
        console.error("Notification error:", notificationError);

        showMessage(
          message,
          "Order saved, but customer email notification failed.",
          "error"
        );
      }
    }

  } catch (error) {
    console.error("Order update error:", error);

    showMessage(
      message,
      "Could not save changes: " + getErrorDetails(error),
      "error"
    );

    button.disabled = false;
    button.textContent = "Save changes";
  }
}
  

  // EXPANDABLE ORDER CARDS

  function renderOrders() {
    ordersList.replaceChildren();

    const search = (searchInput?.value || "").trim().toLowerCase();

    const filtered = currentOrders.filter(order =>
      [
        order.tracking_number,
        order.customer_name,
        order.destination,
        order.country
      ].some(value =>
        String(value || "").toLowerCase().includes(search)
      )
    );

    if (!filtered.length) {
      ordersList.textContent = "No matching orders found.";
      return;
    }

    filtered.forEach(order => {
      const card = document.createElement("details");

      card.style.background = "#17191D";
      card.style.color = "#FFFFFF";
      card.style.border = "1px solid #444";
      card.style.borderRadius = "10px";
      card.style.margin = "8px 0";
      card.style.overflow = "hidden";

      const summary = document.createElement("summary");
      summary.style.listStyle = "none";
      summary.style.cursor = "pointer";
      summary.style.padding = "12px";

      const name = document.createElement("strong");
      name.textContent = order.customer_name || "Customer";
      name.style.fontSize = "14px";

      const tracking = document.createElement("div");
      tracking.textContent = order.tracking_number || "No tracking number";
      tracking.style.color = "#D4AF37";
      tracking.style.fontSize = "12px";
      tracking.style.marginTop = "5px";

      const statusLine = document.createElement("div");
      statusLine.style.display = "flex";
      statusLine.style.justifyContent = "space-between";
      statusLine.style.flexWrap = "wrap";
      statusLine.style.gap = "6px";
      statusLine.style.marginTop = "8px";

      const shipmentStatus = document.createElement("span");
      shipmentStatus.textContent = order.status || "Awaiting payment";
      shipmentStatus.style.color = getStatusColor(order.status);
      shipmentStatus.style.fontSize = "12px";
      shipmentStatus.style.fontWeight = "700";

      const paymentStatus = document.createElement("span");
      paymentStatus.textContent = order.payment_status || "Awaiting payment";
      paymentStatus.style.color = getStatusColor(order.payment_status);
      paymentStatus.style.fontSize = "12px";
      paymentStatus.style.fontWeight = "700";

      statusLine.append(shipmentStatus, paymentStatus);
      summary.append(name, tracking, statusLine);

      const detailsBox = document.createElement("div");
      detailsBox.style.padding = "12px";
      detailsBox.style.borderTop = "1px solid #444";
      detailsBox.style.background = "#202226";

      const heading = document.createElement("h4");
      heading.textContent = "ORDER DETAILS";
      heading.style.color = "#D4AF37";
      heading.style.fontSize = "13px";
      heading.style.margin = "2px 0 12px";

      detailsBox.appendChild(heading);

      addDetail(detailsBox, "Customer", order.customer_name);
      addDetail(detailsBox, "Phone", order.customer_phone);
      addDetail(detailsBox, "Email", order.customer_email);
      addDetail(detailsBox, "Order source", order.order_source);
      addDetail(detailsBox, "Country", order.country);
      addDetail(detailsBox, "Destination", order.destination);
      addDetail(detailsBox, "Package", order.package_description);
      addDetail(detailsBox, "Currency", order.currency);

      if (order.order_amount != null) {
        addDetail(
          detailsBox,
          "Order amount",
          `${order.currency || ""} ${order.order_amount}`
        );
      }

      if (order.delivery_amount != null) {
        addDetail(
          detailsBox,
          "Delivery amount",
          `${order.currency || ""} ${order.delivery_amount}`
        );
      }

      addDetail(detailsBox, "Courier", order.courier_name);
      addDetail(detailsBox, "Courier waybill", order.courier_waybill);
      addDetail(detailsBox, "Estimated delivery", order.estimated_delivery);

      // STATUS EDITOR

      const statusLabel = makeLabel("Shipment status");
      const statusSelect = makeSelect(
        statuses,
        order.status || "Order processing"
      );

      detailsBox.append(statusLabel, statusSelect);

      const paymentLabel = makeLabel("Payment status");
      const paymentSelect = makeSelect(
        paymentStatuses,
        order.payment_status || "Awaiting payment"
      );

      detailsBox.append(paymentLabel, paymentSelect);

      // INSTRUCTION DESCRIPTION EDITOR
      // Only descriptions and three text colours are editable here.

      const collectionLabel = makeLabel("Collection description");
      const collectionTextarea = makeTextarea(
        order.collection_instructions,
        "Enter collection instructions for the customer"
      );

      detailsBox.append(collectionLabel, collectionTextarea);

      const collectionColorLabel = makeLabel("Collection text colour");
      const collectionColor = makeInstructionColorSelect(
        order.collection_text_color
      );

      detailsBox.append(collectionColorLabel, collectionColor);

      const deliveryLabel = makeLabel("Delivery description");
      const deliveryTextarea = makeTextarea(
        order.delivery_instructions,
        "Enter delivery instructions for the customer"
      );

      detailsBox.append(deliveryLabel, deliveryTextarea);

      const deliveryColorLabel = makeLabel("Delivery text colour");
      const deliveryColor = makeInstructionColorSelect(
        order.delivery_text_color
      );

      detailsBox.append(deliveryColorLabel, deliveryColor);

      const saveMessage = document.createElement("p");
      saveMessage.setAttribute("role", "status");
      saveMessage.style.fontSize = "13px";
      saveMessage.style.fontWeight = "600";

      const saveButton = makeSaveButton("Save changes");

      saveButton.addEventListener("click", async () => {
        const changes = {
          status: statusSelect.value,
          payment_status: paymentSelect.value,
          collection_instructions: collectionTextarea.value.trim(),
          collection_text_color:
            instructionColors[collectionColor.value],
          delivery_instructions: deliveryTextarea.value.trim(),
          delivery_text_color:
            instructionColors[deliveryColor.value]
        };

        await saveOrderChanges(
          order,
          changes,
          saveButton,
          saveMessage
        );
      });

      detailsBox.append(saveButton, saveMessage);
      card.append(summary, detailsBox);
      ordersList.appendChild(card);
    });
  }

  // REGISTER NEW CUSTOMER ORDER

  if (orderForm) {
    
orderForm.addEventListener("submit", async event => {
  event.preventDefault();

  if (!db) {
    showMessage(
      orderMessage,
      "Database connection unavailable.",
      "error"
    );
    return;
  }

  const button = orderForm.querySelector('button[type="submit"]');

  button.disabled = true;
  showMessage(orderMessage, "Registering customer order...", "info");

  try {
    const estimatedDelivery = getEstimatedDeliveryDate(
      document.getElementById("estimated-delivery").value
    );

    const order = {
      customer_name: document.getElementById("customer-name").value.trim(),
      customer_phone: document.getElementById("customer-phone").value.trim(),
      customer_email: document.getElementById("customer-email").value.trim() || null,
      order_source: document.getElementById("order-source").value,
      country: document.getElementById("country").value,
      currency: document.getElementById("currency").value,
      destination: document.getElementById("destination").value.trim(),
      package_description: document.getElementById("package-description").value.trim(),
      order_amount: Number(document.getElementById("order-amount").value),
      delivery_amount: Number(document.getElementById("delivery-amount").value),
      payment_status: document.getElementById("payment-status").value,
      courier_name: document.getElementById("courier-name").value.trim() || null,
      courier_waybill: document.getElementById("courier-waybill").value.trim() || null,
      estimated_delivery: estimatedDelivery,
      collection_instructions:
        document.getElementById("collection-instructions").value.trim() || null
    };

    const { data, error } = await db
      .from("orders")
      .insert(order)
      .select("id, tracking_number")
      .single();

    if (error) throw error;

    orderForm.reset();

    await loadOrders();

    showMessage(
      orderMessage,
      "Order registered successfully. Tracking number: " +
        (data?.tracking_number || "Generated"),
            "success"
    );
    

    // SEND AUTOMATIC NEW ORDER CONFIRMATION EMAIL
    if (data?.id) {
      try {
        const { data: notification, error: notificationError } =
          await db.functions.invoke("sekiflex-order-notifications", {
            body: {
  order_id: data.id,
  event_type: "order_created"
},
headers: {
  Authorization: `Bearer ${(await db.auth.getSession()).data.session?.access_token}`
}
}); 
    

        if (notificationError || notification?.error) {
          console.error(
            "Order confirmation email error:",
            notificationError || notification.error
          );

          showMessage(
            orderMessage,
            "Order registered successfully, but confirmation email could not be sent.",
            "error"
          );
        } else {
          showMessage(
            orderMessage,
            "Order registered successfully! Tracking number: " +
              data.tracking_number +
              ". Customer confirmation email sent.",
            "success"
          );
        }
      } catch (notificationError) {
        console.error("Email notification error:", notificationError);

        showMessage(
          orderMessage,
          "Order registered successfully, but email notification failed.",
          "error"
        );
      }
    }

  } catch (error) {
    console.error("Order registration error:", error);

    showMessage(
      orderMessage,
      "Could not register order: " + getErrorDetails(error),
      "error"
    );

  } finally {
    button.disabled = false;
  }
});
  }    

  // SEARCH ORDERS

  if (searchInput) {
    searchInput.addEventListener("input", renderOrders);
  }

  // REFRESH ORDERS

  if (refreshButton) {
    refreshButton.addEventListener("click", loadOrders);
  }

  // STAFF LOGOUT

  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      if (!db) return;

      const { error } = await db.auth.signOut();

      if (error) {
        console.error("Logout error:", error);
        return;
      }

      currentOrders = [];
      ordersList.replaceChildren();
      setDashboardVisible(false);

      showMessage(loginMessage, "You have signed out.", "success");
    });
  }

  // RESTORE EXISTING STAFF SESSION

  if (!db) {
    setDashboardVisible(false);

    showMessage(
      loginMessage,
      "Database connection unavailable. Please check your configuration.",
      "error"
    );

    return;
  }

  try {
    const { data, error } = await db.auth.getSession();

    if (error) throw error;

    if (data?.session?.user) {
      await enterDashboard(data.session.user);
    } else {
      setDashboardVisible(false);
    }

  } catch (error) {
    console.error("Session error:", error);
    setDashboardVisible(false);
  }
});
