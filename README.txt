SEKIFLEX COLLECTIONS WEBSITE - FIRST BUILD

BUSINESS IDENTITY
Store: SEKIFLEX COLLECTIONS
Parent company: SEKIFLEX LIMITED
Existing GOB store/domain: https://sekiflexcollections.com
Planned tracking subdomain: track.sekiflexcollections.com
Tracking reference format: SC-YYYY-000001
Brand palette: Midnight Charcoal #17191D, Champagne Gold #C6A15B, Warm Ivory #F7F4EC

FILES
index.html  - public company homepage with Shop Online link to existing GOB store
track.html  - customer tracking page interface
admin.html  - company dashboard layout preview
styles.css - responsive visual design
app.js      - basic navigation and form-preview interactions

IMPORTANT CURRENT LIMITATIONS
This is the first front-end build. It is not yet connected to Supabase or a live tracking database.
The tracking page checks the SC reference format only; it does not retrieve shipment records.
The admin form is a design preview only; it does not save customer data or issue real SC numbers.
Do not enter real customer details into the preview.
The WhatsApp ordering channel is intentionally not replaced. Add the existing business WhatsApp link when configuring the final buttons.

NEXT BUILD PHASE
1. Connect the existing Supabase project using secure environment/configuration practices.
2. Set up authentication and staff-only admin access.
3. Create orders and shipment database tables, policies, and SC reference generation.
4. Connect customer tracking lookup to the database with safe public access.
5. Add status history, carrier waybill details, package labels and collection slips.
6. Add destination-based rate tables using verified carrier prices.
7. Add email/WhatsApp notifications only after provider setup and cost review.
8. Configure track.sekiflexcollections.com without changing the existing GOB domain records.

DEPLOYMENT
You can test the site locally by opening index.html in a browser.
For GitHub Pages, upload these files to a separate SEKIFLEX project repository and enable Pages.
Do not overwrite the Quick Delivery Express project or change the GOB domain connection.
