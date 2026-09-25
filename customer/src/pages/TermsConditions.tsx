import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export const TermsContent = () => (
      <div className="px-4 py-6 space-y-6 text-gray-800">
        <section>
          <h2 className="text-lg font-bold mb-2">1. Acceptance of Terms</h2>
          <p className="text-sm leading-relaxed">
            Welcome to Urban Steam, a unit of ACS Group. These Terms of Service ("Terms") constitute a legally binding agreement between you ("User," "you," or "your") and Urban Steam ("we," "us," or "our") governing your use of the Urban Steam mobile application (the "App") and our steam ironing, pickup, and delivery services (collectively, the "Services"). By creating an account, accessing the App, or using our Services, you acknowledge that you have read, understood, and agree to be bound by these Terms. If you do not agree to these Terms, you may not use our Services.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2">2. Service Description</h2>
          <p className="text-sm leading-relaxed">
            Urban Steam provides on-demand steam ironing services. Our Services include the pickup of your garments from your specified location, processing them at our facility, and delivering them back to you. The specific services available are listed within the App.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2">3. User Accounts and Orders</h2>
          <div className="text-sm leading-relaxed space-y-2">
            <p>a) To use our Services, you must register for an account and provide accurate, current, and complete information.</p>
            <p>b) You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</p>
            <p>c) All orders for Services must be placed exclusively through the App.</p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2">4. Pricing and Payments</h2>
          <div className="text-sm leading-relaxed space-y-2">
            <p>a) All prices for our Services are listed in Indian Rupees (Rs.) within the App and are subject to change without prior notice.</p>
            <p>b) Prices are inclusive of all applicable taxes, including Goods and Services Tax (GST).</p>
            <p>c) Payments must be made in full at the time of placing an order through our designated payment gateway, Razorpay, or other methods specified in the App.</p>
            <p>d) We do not store your complete payment card details. All payment transactions are processed securely by our third-party payment processors.</p>
          </div>
        </section>

        <section id="garment-care">
          <h2 className="text-lg font-bold mb-2">5. Garment Care and Processing</h2>
          <div className="text-sm leading-relaxed space-y-2">
            <p>a) Urban Steam will exercise professional care and diligence in the processing of all garments.</p>
            <p>b) We are not responsible for any damage resulting from inherent weaknesses, defects, or colour loss in materials that were not apparent prior to processing.</p>
            <p>c) We follow the care labels on each garment. In the absence of a care label, we will process the garment using our professional judgment.</p>
          </div>
        </section>

        <section id="damage-loss">
          <h2 className="text-lg font-bold mb-2">6. Limitation of Liability for Damaged or Lost Items</h2>
          <div className="text-sm leading-relaxed space-y-2">
            <p>a) In the rare event of damage or loss of an item that is directly attributable to our handling, you must notify our customer support team in writing within twenty-four (24) hours of delivery.</p>
            <p>b) Our total liability for any single damaged or lost item is limited to a maximum of ten (10) times the charge for processing that specific item, as indicated on your invoice.</p>
            <p>c) We are not liable for any loss of or damage to personal belongings (such as cash, jewellery, accessories, or other valuables) left in the garments. You agree to check all pockets and garments for such items before handing them over for pickup.</p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2">7. User Responsibilities</h2>
          <p className="text-sm leading-relaxed mb-2">You agree to:</p>
          <div className="text-sm leading-relaxed space-y-2">
            <p>a) Inspect all garments for personal belongings before pickup.</p>
            <p>b) Not submit any hazardous, dangerous, or illegal materials with your garments.</p>
            <p>c) Provide accurate and complete address and contact information.</p>
            <p>d) Ensure that you or an authorized representative is available at the specified address during the scheduled pickup and delivery time slots.</p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2">8. Pickup and Delivery</h2>
          <div className="text-sm leading-relaxed space-y-2">
            <p>a) All pickups and deliveries must be scheduled through the App.</p>
            <p>b) The time slots provided are estimates. We are not liable for delays caused by traffic, weather, or other unforeseen circumstances, but we will make reasonable efforts to keep you informed.</p>
            <p>c) A failed pickup or delivery attempt due to your unavailability may result in order cancellation or an additional rescheduling fee.</p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2">9. Cancellation and Refund Policy</h2>
          <div className="text-sm leading-relaxed space-y-2">
            <p>a) <strong>Cancellation:</strong> You may cancel an order free of charge at any time before our delivery partner has been dispatched for pickup via the App. If the rider has already been dispatched, a cancellation fee may apply.</p>
            <p>b) <strong>Refunds:</strong></p>
            <div className="pl-4 space-y-2">
              <p>i. No refunds will be provided for services that have been successfully completed and delivered.</p>
              <p>ii. For service complaints (e.g., quality issues), you must contact our support within 24 hours of delivery. We will investigate and, at our sole discretion, may offer to re-process the item or provide a credit to your account.</p>
              <p>iii. Compensation for damaged or lost items is governed by Section 6 of these Terms.</p>
              <p>iv. Any approved refunds will be processed to the original payment method within 5-7 business days.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2">10. General Limitation of Liability</h2>
          <p className="text-sm leading-relaxed">
            To the maximum extent permitted by applicable law, ACS Group and Urban Steam, its affiliates, and their respective officers, directors, and employees shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or use, arising out of or in any way connected with your use of the App or Services.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2">11. Governing Law and Jurisdiction</h2>
          <p className="text-sm leading-relaxed">
            These Terms shall be governed by and construed in accordance with the laws of India. Any dispute, claim, or controversy arising out of or relating to these Terms or the breach thereof shall be subject to the exclusive jurisdiction of the courts located in Bengaluru, Karnataka, India.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2">12. Compliance with Consumer Protection Law</h2>
          <p className="text-sm leading-relaxed">
            These Terms are intended to define the relationship between Urban Steam and our Users. However, nothing in these Terms shall be construed to limit or waive any rights, remedies, or protections that a User is granted as a consumer under the mandatory provisions of the Consumer Protection Act, 2019, and any rules made thereunder, or any other applicable consumer law. In the event of any conflict or inconsistency between a provision in these Terms and a mandatory provision of the Consumer Protection Act, 2019, the provisions of the Act shall prevail to the extent of such conflict.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2">13. Severability</h2>
          <p className="text-sm leading-relaxed">
            If any provision of these Terms is found to be invalid, illegal, or unenforceable by a court or competent authority under the Consumer Protection Act, 2019 or any other law, the validity, legality, and enforceability of the remaining provisions will not in any way be affected or impaired. Such a provision shall be deemed modified to the minimum extent necessary to make it valid, legal, and enforceable.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2">14. Contact Information</h2>
          <p className="text-sm leading-relaxed">
            For any questions, support, or to report an issue regarding these Terms or our Services, please contact us at:
          </p>
          <p className="text-sm font-semibold mt-2">Support Email: support@urbansteam.in</p>
        </section>
      </div>
);

const TermsConditions = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="px-4 py-4 flex items-center gap-3 shadow-lg" style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}>
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>
        <h1 className="text-xl font-bold text-white">Terms & Conditions</h1>
      </header>

      <TermsContent />
    </div>
  );
};

export default TermsConditions;
