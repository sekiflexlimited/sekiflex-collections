
document.addEventListener("DOMContentLoaded", async () => {
  // SEKIFLEX COLLECTIONS

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

  let db = null;

  if (window.supabase && window.SEKIFLEX_SUPABASE_URL && window.SEKIFLEX_SUPABASE_KEY) {
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

  function addDetail(container, label, value) {
    if (value === null || value === undefined || value === "") return;
    const p = document.createElement("p");
    const strong = document.createElement("strong");
    strong.textContent = label + ": ";
    p.append(strong, document.createTextNode(String(value)));
    container.appendChild(p);
  }

  // CUSTOMER TRACKING
  const trackingForm = document.getElementById("tracking-form");

  if (trackingForm) {
    trackingForm.addEventListener("submit", async event => {
      event.preventDefault();

      const number = document.getElementById("tracking-number").value.trim().toUpperCase();
      const phone = document.getElementById("phone-last4").value.trim();
      const message = document.getElementById("tracking-message");
      const result = document.getElementById("tracking-result");
      const button = trackingForm.querySelector('button[type="submit"]');

      result.replaceChildren();

      if (!/^SC-\d{4}-\d{6}$/.test(number)) {
        showMessage(message, "Please enter a valid SC tracking number.", "error");
        return;
      }

      if (!/^\d{4}$/.test(phone)) {
        showMessage(message, "Please enter the last four digits of your registered phone number.", "error");
        return;
      }

      if (!db) {
        showMessage(message, "Tracking service is temporarily unavailable.", "error");
        return;
      }

      button.disabled = true;
      showMessage(message, "Checking your shipment. Please wait...", "info");

      try {
        const { data, error } = await db.rpc("track_sekiflex_order", {
          p_tracking_number: number,
          p_phone_last4: phone
        });

        if (error) throw error;

        const shipment = Array.isArray(data) ? data[0] : data;

        if (!shipment) {
          showMessage(message, "We couldn't find a shipment matching those details. Please check and try again.", "error");
          return;
        }

        showMessage(message, "Your shipment information was found.", "success");

        const heading = document.createElement("h2");
        heading.textContent = "Shipment details";
        result.appendChild(heading);

        addDetail(result, "Tracking number", shipment.tracking_number);
        addDetail(result, "Current status", shipment.status);
        addDetail(result, "Payment status", shipment.payment_status);
        addDetail(result, "Country", shipment.country);
        addDetail(result, "Destination", shipment.destination);
        addDetail(result, "Currency", shipment.currency);

        if (shipment.order_amount !== null && shipment.order_amount !== undefined) {
          addDetail(result, "Order amount", `${shipment.currency || ""} ${shipment.order_amount}`);
        }
        if (shipment.delivery_amount !== null && shipment.delivery_amount !== undefined) {
          addDetail(result, "Delivery amount", `${shipment.currency || ""} ${shipment.delivery_amount}`);
        }

        addDetail(result, "Courier", shipment.courier_name);
        addDetail(result, "Courier waybill", shipment.courier_waybill);
        addDetail(result, "Estimated delivery", shipment.estimated_delivery);
        addDetail(result, "Collection instructions", shipment.collection_instructions);

        if (shipment.updated_at) {
          const updated = document.createElement("small");
          updated.textContent = "Last updated: " + new Date(shipment.updated_at).toLocaleString();
          result.appendChild(updated);
        }
      } catch (error) {
        console.error("Tracking error:", error);
        showMessage(message, "We couldn't complete your tracking request. Please try again.", "error");
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

  const statuses = [
    "Awaiting payment",
    "Payment confirmed",
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

  const paymentStatuses = ["Awaiting payment", "Payment confirmed"];
  let currentOrders = [];

  function setDashboardVisible(visible) {
    loginSection.hidden = visible;
    dashboard.hidden = !visible;
  }

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
      showMessage(loginMessage, "This account is not authorized to access the staff dashboard.", "error");
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
        showMessage(loginMessage, "Database connection is unavailable.", "error");
        return;
      }

      const email = document.getElementById("admin-email").value.trim();
      const password = document.getElementById("admin-password").value;
      const button = loginForm.querySelector('button[type="submit"]');

      button.disabled = true;
      showMessage(loginMessage, "Signing in securely...", "info");

      try {
        const { data, error } = await db.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await enterDashboard(data.user);
      } catch (error) {
        console.error("Login error:", error);
        showMessage(loginMessage, "Sign-in failed. Check your email and password.", "error");
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
      ordersList.textContent = "Could not load orders. Please refresh.";
      return;
    }

    currentOrders = data || [];

    document.getElementById("stat-total").textContent = currentOrders.length;
    document.getElementById("stat-payment").textContent =
      currentOrders.filter(order => order.payment_status === "Awaiting payment").length;
    document.getElementById("stat-transit").textContent =
      currentOrders.filter(order => order.status === "In transit").length;
    document.getElementById("stat-delivered").textContent =
      currentOrders.filter(order => order.status === "Delivered").length;

    renderOrders();
  }

  function makeSelect(options, selectedValue) {
    const select = document.createElement("select");
    select.style.display = "block";
    select.style.width = "100%";
    select.style.marginTop = "8px";
    select.style.minHeight = "44px";
    select.style.padding = "8px";

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

  // DISPLAY AND UPDATE ORDERS
  function renderOrders() {
    ordersList.replaceChildren();

    const search = (searchInput?.value || "").trim().toLowerCase();

    const filtered = currentOrders.filter(order =>
      [
        order.tracking_number,
        order.customer_name,
        order.destination,
        order.country
      ].some(value => String(value || "").toLowerCase().includes(search))
    );

    if (!filtered.length) {
      ordersList.textContent = "No matching orders found.";
      return;
    }

    filtered.forEach(order => {
      const card = document.createElement("article");
      card.className = "stat-card";
      card.style.marginTop = "16px";

      const title = document.createElement("h3");
      title.textContent = order.tracking_number || "Order";
      card.appendChild(title);

      addDetail(card, "Customer", order.customer_name);
      addDetail(card, "Phone", order.customer_phone);
      addDetail(card, "Country", order.country);
      addDetail(card, "Destination", order.destination);
      addDetail(card, "Currency", order.currency);

      if (order.order_amount !== null && order.order_amount !== undefined) {
        addDetail(card, "Order amount", `${order.currency || ""} ${order.order_amount}`);
      }
      if (order.delivery_amount !== null && order.delivery_amount !== undefined) {
        addDetail(card, "Delivery amount", `${order.currency || ""} ${order.delivery_amount}`);
      }

      const paymentLabel = document.createElement("label");
      paymentLabel.textContent = "Payment status";
      paymentLabel.style.display = "block";
      paymentLabel.style.marginTop = "14px";

      const paymentSelect = makeSelect(paymentStatuses, order.payment_status || "Awaiting payment");

      const shipmentLabel = document.createElement("label");
      shipmentLabel.textContent = "Shipment status";
      shipmentLabel.style.display = "block";
      shipmentLabel.style.marginTop = "14px";

      const shipmentSelect = makeSelect(statuses, order.status || "Awaiting payment");

      const updateButton = document.createElement("button");
      updateButton.type = "button";
      updateButton.className = "btn btn-gold";
      updateButton.style.marginTop = "14px";
      updateButton.textContent = "Save payment and shipment updates";

      const feedback = document.createElement("p");
      feedback.setAttribute("role", "status");

      updateButton.addEventListener("click", async () => {
        updateButton.disabled = true;
        showMessage(feedback, "Saving updates...", "info");

        try {
          const { error } = await db
            .from("orders")
            .update({
              payment_status: paymentSelect.value,
              status: shipmentSelect.value
            })
            .eq("id", order.id);

          if (error) throw error;

          showMessage(feedback, "Payment and shipment updates saved.", "success");
          await loadOrders();
        } catch (error) {
          console.error("Order update error:", error);
          showMessage(feedback, "Could not save updates. Please try again.", "error");
        } finally {
          updateButton.disabled = false;
        }
      });

      card.append(
        paymentLabel,
        paymentSelect,
        shipmentLabel,
        shipmentSelect,
        updateButton,
        feedback
      );

      ordersList.appendChild(card);
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", renderOrders);
  }

  const refreshButton = document.getElementById("refresh-orders");
  if (refreshButton) refreshButton.addEventListener("click", loadOrders);

  // REGISTER A NEW ORDER
  if (orderForm) {
    orderForm.addEventListener("submit", async event => {
      event.preventDefault();

      if (!db) {
        showMessage(orderMessage, "Database connection is unavailable.", "error");
        return;
      }

      const button = orderForm.querySelector('button[type="submit"]');
      button.disabled = true;
      showMessage(orderMessage, "Registering your order...", "info");

      const amount = Number(document.getElementById("order-amount").value);
      const delivery = Number(document.getElementById("delivery-amount").value);

      if (!Number.isFinite(amount) || !Number.isFinite(delivery) || amount < 0 || delivery < 0) {
        showMessage(orderMessage, "Please enter valid amounts. Amounts cannot be negative.", "error");
        button.disabled = false;
        return;
      }

      const order = {
        customer_name: document.getElementById("customer-name").value.trim(),
        customer_phone: document.getElementById("customer-phone").value.trim(),
        customer_email: document.getElementById("customer-email").value.trim() || null,
        order_source: document.getElementById("order-source").value,
        country: document.getElementById("country").value,
        currency: document.getElementById("currency").value,
        destination: document.getElementById("destination").value.trim(),
        package_description: document.getElementById("package-description").value.trim(),
        courier_name: document.getElementById("courier-name").value.trim() || null,
        courier_waybill: document.getElementById("courier-waybill").value.trim() || null,
        payment_status: document.getElementById("payment-status").value,
        order_amount: amount,
        delivery_amount: delivery,
        estimated_delivery: document.getElementById("estimated-delivery").value.trim() || null,
        collection_instructions: document.getElementById("collection-instructions").value.trim() || null
      };

      try {
        const { data, error } = await db
          .from("orders")
          .insert(order)
          .select("tracking_number")
          .single();

        if (error) throw error;

        showMessage(
          orderMessage,
          "Order registered successfully! SC tracking number: " + data.tracking_number,
          "success"
        );

        orderForm.reset();
        document.getElementById("country").value = "Nigeria";
        document.getElementById("currency").value = "NGN";
        document.getElementById("delivery-amount").value = "0";

        await loadOrders();
      } catch (error) {
        console.error("Order registration error:", error);
        showMessage(orderMessage, "Order could not be registered. Please check the details and try again.", "error");
      } finally {
        button.disabled = false;
      }
    });
  }

  // LOG OUT
  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      if (db) await db.auth.signOut();
      setDashboardVisible(false);
      showMessage(loginMessage, "You have signed out securely.", "success");
    });
  }

  // RESTORE STAFF SESSION
  setDashboardVisible(false);

  if (!db) {
    showMessage(loginMessage, "Database connection is unavailable.", "error");
    return;
  }

  const { data: sessionData } = await db.auth.getSession();

  if (sessionData?.session) {
    await enterDashboard(sessionData.session.user);
  }
});
