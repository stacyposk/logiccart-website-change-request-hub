# LogicCart Bedrock Agent Policy

## Banner Analysis Focus (Nova Lite Vision)

### What the Agent Should Check
The agent focuses on visual analysis that cannot be done by frontend validation:

#### Visual Content Quality
- **Professional appearance**: Clean, polished design suitable for e-commerce
- **Image quality**: No pixelation, blur, compression artifacts, or poor resolution
- **Brand alignment**: Colors should complement LogicCart's purple (#5754FF) theme

#### Content Appropriateness  
- **No inappropriate content**: Adult material, offensive imagery, or unprofessional content
- **No competitor branding**: Logos or branding from competing e-commerce platforms
- **No misleading claims**: False advertising, fake discounts, or deceptive pricing
- **Copyright compliance**: No obvious watermarks or stock photo violations

#### URL Validation
- **Approved domains only**: logicart.com, shop.logicart.com, blog.logicart.com, support.logicart.com
- **No external redirects**: URLs must point to LogicCart properties only

### What's Already Validated (Skip These)
The frontend form already validates these - agent should NOT re-check:
- File size (500KB limit enforced by upload for each image)
- File format (PNG, JPG, JPEG, WebP only)  
- Alt text presence (required form field)
- Basic dimensions (upload validation)
- Required form fields (name, email, description)

## Decision Logic

### AUTO-APPROVE if:
- Professional image quality
- Appropriate content
- LogicCart brand colors present
- Approved URL domain
- No prohibited elements
- Festival banners are exception case for illustrations and brand colors

### REJECT if:
- Poor image quality (blurry, pixelated)
- Inappropriate/offensive content
- Competitor branding visible
- Non-approved URL domain
- Misleading claims detected

### NEEDS_INFO if:
- Borderline image quality
- Unclear brand compliance
- URL needs verification

## Feature Request Processing

### Always Return NEEDS_INFO
All NEW_FEATURE requests automatically get NEEDS_INFO with guidance on:

#### Required Information
1. **User Stories**: "As a [role], I want [feature], so that [benefit]" format
2. **Visual Mockups**: Reference images, Wireframes, Figma links, or design specifications  
3. **Technical Specs**: API requirements, database changes, integrations, project requirements and constraints
4. **Success Metrics**: KPIs, user engagement targets, business impact

#### Email Template
```
Subject: New Request {ticket_id} - Additional Information Required

Hello {requester_name},

Thank you for submitting your {change_type} request. To ensure we build exactly what you need, please provide the following information:

**Your Original Request Summary:**
• **Request Type:** {change_type}
• **Department:** {department}
• **Impacted Page Area:** {page_area}
• **Impacted Page URLs:** {page_urls}
• **Target Go-live Date:** {target_launch_date}
• **Original Description:** {description}
{original_copy_text}
{original_notes}

**Additional Information Required:**

**1. User Stories** (Required)
Format: "As a [user type], I want [functionality], so that [benefit]"
Example: "As a customer, I want to save items to a wishlist, so that I can purchase them later"

**2. Visual Design** (Required)
• Reference images, wireframes or mockups showing the ideal user interface
• Figma links or design specifications
• Mobile and desktop layouts if applicable

**3. Technical Specifications** (Required)
• What data needs to be stored or retrieved?
• Any integrations with existing systems?
• Performance or scalability requirements?

**4. Success Metrics** (Required)
• How will we measure if this feature is successful?
• Expected user engagement or business impact?
• Any specific KPIs or targets?

**Next Steps:**
Please reply to this email with the above information. Once received, our development team will review and provide a timeline estimate.

**Questions?** Contact us at product@logiccart.com

Best regards,
LogicCart Web Development Team

---
Request ID: {ticket_id}
Submitted: {submission_date}
```

## Cost Optimization Notes

This policy is optimized for AWS Nova Lite:
- **Concise criteria** to minimize token usage
- **Clear decision rules** to reduce processing time  
- **Visual focus** leveraging Nova Lite's vision capabilities
- **No redundant validation** of frontend-checked items

## Policy Metadata
- **Version**: 1.0
- **Model**: Amazon Nova Lite
- **Last Updated**: September 2025