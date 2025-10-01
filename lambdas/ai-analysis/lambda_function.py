import json
import boto3
import base64
import os
from typing import Dict, Any, List

# Initialize Bedrock Runtime client
bedrock_runtime = boto3.client('bedrock-runtime', region_name=os.environ.get('AWS_DEFAULT_REGION'))
ALLOWED_ORIGIN = os.environ.get('ALLOWED_ORIGIN', '*')

def get_business_focused_prompt(change_type: str, ticket_summary: Dict[str, Any], policies: List[str]) -> List[Dict[str, Any]]:
    """
    Generate business-focused prompt templates based on change type.
    Excludes system-enforced validation items and focuses on implementation requirements.
    """
    
    # Extract language and copy details
    language = ticket_summary.get('language', '')
    copy_en = ticket_summary.get('copyEn', '').strip()
    copy_zh = ticket_summary.get('copyZh', '').strip()
    target_date = ticket_summary.get('targetLaunchDate', '')
    
    # Build language-specific copy information
    copy_info = []
    if copy_en:
        copy_info.append(f"English copy: '{copy_en}'")
    if copy_zh:
        copy_info.append(f"Chinese copy: '{copy_zh}'")
    
    copy_details = " and ".join(copy_info) if copy_info else "Not provided"
    
    # Base business-focused instruction
    base_instruction = f"""You are generating specific acceptance criteria for developers implementing this exact website change request.

ANALYZE THE SPECIFIC REQUEST DETAILS:
- Page Area: {ticket_summary.get('pageArea', 'Not specified')}
- Description: {ticket_summary.get('description', 'Not provided')}
- Language Support: {language}
- Copy Content: {copy_details}
- Target Launch Date: {target_date or 'Not specified'}

GENERATE SPECIFIC CRITERIA based on the actual request content, NOT generic templates.

EXCLUDE these items (already handled by system):
- Alt text validation (form requires this)
- File size validation (enforced by frontend)  
- Mobile/desktop responsiveness (images uploaded for both)
- Page loading speed (not a business requirement)
- Brand guideline compliance for seasonal campaigns (Mid-Autumn Festival allows traditional elements)
- WCAG/accessibility guidelines (handled separately)

FOCUS ON SPECIFIC IMPLEMENTATION REQUIREMENTS for this exact request:
- Exact copy/text content that needs to be implemented (include all languages provided)
- Specific visual elements described in the request
- Page area integration requirements
- Target launch date considerations for implementation timeline
- Language-specific display requirements if multiple languages provided

IMPORTANT: Include ALL provided copy content (both English and Chinese if provided) in the acceptance criteria."""

    # Change-type-specific focus areas
    change_type_templates = {
        "New Banner": {
            "focus": f"Homepage hero banner implementation with bilingual Mid-Autumn Festival content",
            "criteria_examples": [
                "Homepage hero banner displays the English headline 'Mid-Autumn Festival Limited-time Offer' and Chinese headline '中秋限時優惠' as provided",
                "Banner includes the English offer details '20% Off on All Products' and Chinese offer details '全場貨品8折' below the main headlines",
                "Implementation uses the uploaded desktop banner (1920x1080) and mobile banner (1080x1350) assets",
                "Banner update is deployed to homepage hero section and ready for October 1st, 2025 launch date",
                f"Content placement and messaging align with the provided copy: {ticket_summary.get('copyEn', '') or ticket_summary.get('copyZh', '') or 'as provided'}",
                f"Visual elements are appropriate for the {ticket_summary.get('pageArea', 'target page area')} context",
                f"Implementation supports the {ticket_summary.get('targetLaunchDate', 'specified timeline')} launch requirements"
            ]
        },
        "Content Update": {
            "focus": "Content accuracy, brand voice alignment, localization, SEO considerations",
            "criteria_examples": [
                "Content aligns with brand voice and messaging guidelines",
                "Copy is clear, benefit-focused, and avoids hype language",
                "Localization maintains meaning and cultural appropriateness",
                "Content updates support SEO objectives and user journey"
            ]
        },
        "Bug Fix": {
            "focus": "Expected behavior restoration, user experience improvements, compatibility",
            "criteria_examples": [
                "Issue is resolved and expected functionality is restored",
                "User experience is improved without introducing new problems",
                "Fix works consistently across different browsers and devices",
                "Performance impact is minimal or positive"
            ]
        },
        "New Feature": {
            "focus": "Detailed feature specifications, user workflows, technical requirements, and business justification - requires comprehensive documentation",
            "criteria_examples": [
                "Feature specification requires detailed user workflow documentation and wireframes",
                "Technical implementation approach and architecture needs detailed analysis",
                "Business value proposition and success metrics must be clearly defined",
                "Integration points with existing systems require comprehensive planning"
            ]
        },
        "SEO Update": {
            "focus": "Search optimization, content structure, technical SEO implementation",
            "criteria_examples": [
                "SEO improvements are implemented without breaking existing functionality",
                "Content structure supports search engine understanding",
                "Page performance is maintained or improved",
                "User experience is enhanced alongside SEO benefits"
            ]
        }
    }
    
    # Get template for specific change type or use generic
    template = change_type_templates.get(change_type, {
        "focus": "User experience, functionality, and business value",
        "criteria_examples": [
            "Implementation meets business requirements and user needs",
            "Changes integrate well with existing functionality",
            "User experience is maintained or improved"
        ]
    })
    
    # Check if this is a Mid-Autumn Festival campaign
    is_mid_autumn = any(term in str(ticket_summary).lower() for term in [
        'mid-autumn', 'mid autumn', 'moon festival', 'mooncake', '中秋'
    ])
    
    # Check if this is a New Feature request (requires more scrutiny)
    is_new_feature = change_type == "New Feature"
    
    # Build the prompt content
    prompt_content = [
        {"text": base_instruction},
        {"text": f"Change Type Focus: {template['focus']}"},
        {"text": f'Schema: {{"decision":"approve|reject","issues":[{{"field":"string","severity":"low|med|high","note":"string"}}],"acceptanceCriteria":["string"],"confidence":0.0}}'},
        {"text": f"Request Details: {json.dumps(ticket_summary)}"},
        {"text": f"Company Policies: {chr(10).join(policies)}"}
    ]
    
    # Add Mid-Autumn Festival specific guidance if detected
    if is_mid_autumn:
        prompt_content.append({
            "text": "SPECIAL NOTE: This appears to be a Mid-Autumn Festival campaign. Traditional illustrations and non-brand colors are ALLOWED per company policy. Do NOT flag brand guideline issues for seasonal traditional elements."
        })
    
    # Add New Feature specific guidance (user-friendly approach)
    if is_new_feature:
        prompt_content.append({
            "text": "NOTE: This is a NEW FEATURE request. Generate helpful acceptance criteria as usual. New features often benefit from:\n- User workflow specifications\n- Technical architecture documentation\n- Business justification and success metrics\n- Integration planning with existing systems\n- User experience wireframes or mockups\n\nGenerate acceptance criteria based on the provided information, and our system will add a friendly reminder about additional documentation that might be helpful."
        })
    
    prompt_content.extend([
        {"text": f"Context-Specific Examples for this {change_type} request:\n" + "\n".join([f"- {example}" for example in template['criteria_examples']])},
        {"text": f"""Generate 3-4 SPECIFIC acceptance criteria for developers implementing THIS exact banner request.

FOCUS ON THESE SPECIFIC IMPLEMENTATION DETAILS:
1. Exact page location: {ticket_summary.get('pageArea', 'specified area')}
2. Specific task: {ticket_summary.get('description', 'provided description')}
3. Exact copy content to implement: {copy_details}
4. Uploaded banner assets (desktop and mobile dimensions)
5. Target deployment date: {target_date}

FOR BILINGUAL CONTENT:
- Specify both English and Chinese text exactly as provided
- Reference both language versions in the criteria
- Ensure developers know to implement both languages

FOR BANNER IMPLEMENTATION:
- Reference the specific uploaded image assets
- Mention the exact page area (homepage hero section)
- Include the target launch date for deployment planning

FOR NEW FEATURE REQUESTS:
- Generate helpful acceptance criteria based on the provided information
- Focus on what can be implemented with the current details
- Our system will add a friendly reminder about additional documentation that might be helpful

AVOID MENTIONING:
- Brand guideline compliance (Mid-Autumn Festival seasonal campaigns are pre-approved)
- Technical validation (alt text, file sizes, responsiveness - handled by system)
- Generic design requirements

Generate specific, actionable criteria that tell developers exactly what to implement for THIS request."""}
    ])
    
    return prompt_content

def filter_system_enforced_items(acceptance_criteria: List[str], change_type: str = '') -> List[str]:
    """
    Filter out system-enforced validation items from AI-generated acceptance criteria.
    Updated to properly handle alt text and other validation items.
    """
    # Patterns that should be completely removed (system handles these)
    system_enforced_patterns = [
        "alt text",
        "file size",
        "image dimensions",
        "dimension validation", 
        "required field",
        "form validation",
        "upload validation",
        "wcag guidelines",
        "accessibility guidelines",
        "mobile responsive",
        "desktop and mobile",
        "load quickly",
        "page performance",
        "call-to-action button",
        "prominently placed"
    ]
    
    filtered_criteria = []
    
    for criterion in acceptance_criteria:
        criterion = criterion.strip()
        if not criterion:
            continue
            
        criterion_lower = criterion.lower()
        
        # Skip criteria that contain system-enforced patterns
        is_system_enforced = any(pattern in criterion_lower for pattern in system_enforced_patterns)
        
        if not is_system_enforced:
            filtered_criteria.append(criterion)
    
    return filtered_criteria

def categorize_criteria_by_type(acceptance_criteria: List[str]) -> Dict[str, List[str]]:
    """
    Categorize acceptance criteria by business type for better organization.
    Returns dictionary with categories as keys and criteria lists as values.
    """
    categorized = {
        'visual': [],
        'content': [],
        'functionality': [],
        'performance': [],
        'accessibility': []
    }
    
    for criterion in acceptance_criteria:
        category = categorize_acceptance_criterion(criterion)
        categorized[category].append(criterion)
    
    # Remove empty categories
    return {k: v for k, v in categorized.items() if v}

def enhance_criteria_with_business_language(acceptance_criteria: List[str], change_type: str) -> List[str]:
    """
    Enhance acceptance criteria with business-focused language and context.
    """
    if not acceptance_criteria:
        return acceptance_criteria
    
    enhanced_criteria = []
    
    for criterion in acceptance_criteria:
        # Apply business language transformation
        business_criterion = transform_to_business_language(criterion, change_type)
        
        # Ensure criterion is actionable and business-focused
        if len(business_criterion.split()) < 5:  # Very short criteria might need enhancement
            category = categorize_acceptance_criterion(business_criterion)
            if category == 'visual':
                business_criterion = f"{business_criterion} with proper visual hierarchy and user experience"
            elif category == 'content':
                business_criterion = f"{business_criterion} while maintaining brand voice and user clarity"
            elif category == 'functionality':
                business_criterion = f"{business_criterion} to support user workflows and business objectives"
        
        enhanced_criteria.append(business_criterion)
    
    return enhanced_criteria

def categorize_acceptance_criterion(criterion: str) -> str:
    """
    Categorize acceptance criteria into business categories.
    Returns: 'visual', 'content', 'functionality', 'performance', 'accessibility'
    """
    criterion_lower = criterion.lower()
    
    # Visual category keywords
    visual_keywords = ['display', 'layout', 'design', 'visual', 'hierarchy', 'placement', 'banner', 'image', 'color', 'font', 'responsive', 'mobile', 'desktop']
    
    # Content category keywords  
    content_keywords = ['content', 'copy', 'text', 'messaging', 'brand voice', 'localization', 'seo', 'headline', 'description']
    
    # Functionality category keywords
    functionality_keywords = ['functionality', 'feature', 'interaction', 'workflow', 'integration', 'behavior', 'click', 'navigation', 'user action']
    
    # Performance category keywords
    performance_keywords = ['performance', 'load', 'speed', 'optimization', 'impact', 'quickly', 'efficient']
    
    # Accessibility category keywords
    accessibility_keywords = ['accessibility', 'accessible', 'screen reader', 'keyboard', 'contrast', 'alt text quality', 'aria']
    
    # Check categories in priority order
    if any(keyword in criterion_lower for keyword in accessibility_keywords):
        return 'accessibility'
    elif any(keyword in criterion_lower for keyword in performance_keywords):
        return 'performance'
    elif any(keyword in criterion_lower for keyword in functionality_keywords):
        return 'functionality'
    elif any(keyword in criterion_lower for keyword in content_keywords):
        return 'content'
    elif any(keyword in criterion_lower for keyword in visual_keywords):
        return 'visual'
    else:
        return 'functionality'  # Default category

def transform_to_business_language(technical_criterion: str, change_type: str = '') -> str:
    """
    Transform technical validation language to business requirements language.
    Enhanced with change-type-specific context and comprehensive mappings.
    """
    
    # Base technical to business transformations
    base_transformations = {
        "alt text is provided": "Images enhance user understanding and are accessible to screen readers",
        "alt text for images is provided": "Images enhance user understanding and are accessible to screen readers",
        "image dimensions are acceptable": "Images display properly across all devices with responsive design",
        "file size requirements": "Images load quickly without impacting page performance",
        "desktop image dimensions": "Desktop layout displays images with proper visual hierarchy",
        "mobile image dimensions": "Mobile layout provides optimal image viewing experience",
        "form validation": "User input meets business requirements and data quality standards",
        "required fields are completed": "All necessary business information is captured for implementation",
        "dimensions are": "Images display effectively with proper responsive design",
        "file size": "Images load quickly without impacting user experience",
        "upload validation": "Content meets quality standards for user experience",
        "field presence": "Required business information is available for implementation"
    }
    
    # Change-type-specific transformations
    change_type_transformations = {
        "New Banner": {
            "image placement": "Banner images are positioned for maximum visual impact and user engagement",
            "call to action": "Call-to-action elements drive user engagement and conversion",
            "visual hierarchy": "Banner design guides user attention to key messaging and actions",
            "brand compliance": "Banner aligns with brand guidelines and seasonal campaign requirements"
        },
        "Content Update": {
            "content accuracy": "Content is accurate, up-to-date, and serves the intended user journey",
            "brand voice": "Copy aligns with brand voice and messaging guidelines",
            "localization": "Content maintains meaning and cultural appropriateness across languages",
            "messaging": "Content effectively communicates value proposition to target audience"
        },
        "Bug Fix": {
            "functionality": "Expected functionality is restored and works consistently",
            "user experience": "User experience is improved without introducing new issues",
            "compatibility": "Fix works reliably across different browsers and devices",
            "behavior": "System behavior matches user expectations and business requirements"
        },
        "New Feature": {
            "user interaction": "Feature provides intuitive user interactions that follow established patterns",
            "integration": "Feature integrates seamlessly with existing user workflows",
            "accessibility": "Feature meets accessibility standards for all users",
            "workflow": "Feature enhances user productivity and business value"
        },
        "SEO Update": {
            "search optimization": "SEO improvements enhance discoverability without breaking functionality",
            "content structure": "Content structure supports search engine understanding and user navigation",
            "technical seo": "Technical SEO implementation maintains optimal page performance",
            "user experience": "SEO enhancements improve both search ranking and user experience"
        }
    }
    
    criterion_lower = technical_criterion.lower()
    
    # First try change-type-specific transformations
    if change_type in change_type_transformations:
        for technical_phrase, business_phrase in change_type_transformations[change_type].items():
            if technical_phrase in criterion_lower:
                return business_phrase
    
    # Then try base transformations
    for technical_phrase, business_phrase in base_transformations.items():
        if technical_phrase in criterion_lower:
            return business_phrase
    
    # If no transformation found, enhance with business context
    if any(tech_word in criterion_lower for tech_word in ['validation', 'check', 'verify', 'ensure']):
        # Convert validation language to business outcome language
        if 'image' in criterion_lower:
            return f"Images enhance user experience and meet business requirements"
        elif 'content' in criterion_lower or 'copy' in criterion_lower:
            return f"Content serves business objectives and user needs effectively"
        elif 'form' in criterion_lower:
            return f"User input supports business processes and data quality"
    
    return technical_criterion

def add_business_context_by_change_type(criteria: List[str], change_type: str) -> List[str]:
    """
    Add business context and rationale to acceptance criteria based on change type.
    """
    
    business_context = {
        "New Banner": {
            "context": "Banner effectiveness depends on visual impact, user engagement, and brand alignment",
            "focus_areas": ["visual hierarchy", "call-to-action placement", "mobile responsiveness", "brand compliance"]
        },
        "Content Update": {
            "context": "Content updates must maintain brand voice while serving user journey objectives",
            "focus_areas": ["brand voice alignment", "content accuracy", "localization quality", "SEO impact"]
        },
        "Bug Fix": {
            "context": "Bug fixes should restore expected functionality while improving overall user experience",
            "focus_areas": ["functionality restoration", "user experience improvement", "cross-browser compatibility", "performance impact"]
        },
        "New Feature": {
            "context": "New features must integrate seamlessly while providing clear business value",
            "focus_areas": ["user workflow integration", "interaction design", "accessibility compliance", "performance optimization"]
        },
        "SEO Update": {
            "context": "SEO improvements should enhance discoverability while maintaining user experience",
            "focus_areas": ["search optimization", "content structure", "technical implementation", "user experience balance"]
        }
    }
    
    if not criteria or change_type not in business_context:
        return criteria
    
    context_info = business_context[change_type]
    enhanced_criteria = []
    
    for criterion in criteria:
        # Add business rationale if criterion is generic
        if len(criterion.split()) < 8:  # Short criteria might need more context
            category = categorize_acceptance_criterion(criterion)
            if category in ['visual', 'content', 'functionality']:
                enhanced_criterion = f"{criterion} (supports {context_info['context'].split(' ')[0].lower()} {context_info['context'].split(' ')[1].lower()})"
                enhanced_criteria.append(enhanced_criterion)
            else:
                enhanced_criteria.append(criterion)
        else:
            enhanced_criteria.append(criterion)
    
    return enhanced_criteria

# Quality validation functions removed to keep lambda lightweight and cost-effective
# All validation is now handled by apply_quality_validation_and_fallback function

# Removed complex validation functions to keep lambda lightweight and cost-effective
# Only essential quality validation is kept in apply_quality_validation_and_fallback

def apply_quality_validation_and_fallback(acceptance_criteria: List[str], change_type: str, ticket_summary: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Apply lightweight quality validation with improved deduplication and quality checks.
    Optimized for minimal processing time and cost.
    """
    if not acceptance_criteria:
        # No criteria provided, use fallback
        fallback_criteria = get_fallback_business_criteria(change_type, ticket_summary)
        return {
            'acceptance_criteria': fallback_criteria[:4],  # Limit to 4 criteria
            'quality_validation': {
                'used_fallback': True,
                'reason': 'No criteria provided',
                'quality_score': 0.0
            }
        }
    
    # Clean and deduplicate criteria first
    cleaned_criteria = []
    seen_keywords = set()
    
    for criterion in acceptance_criteria:
        criterion = criterion.strip()
        if not criterion:
            continue
            
        criterion_lower = criterion.lower()
        
        # Skip system-enforced patterns entirely
        if any(pattern in criterion_lower for pattern in [
            'alt text is provided', 'alt text for images', 'file size', 'dimension validation', 
            'required field', 'form validation', 'upload validation'
        ]):
            continue
        
        # Extract key words for deduplication
        key_words = set()
        for word in criterion_lower.split():
            if len(word) > 3 and word not in ['must', 'should', 'will', 'with', 'that', 'this', 'have']:
                key_words.add(word)
        
        # Check for significant overlap with existing criteria
        overlap_threshold = 0.6
        is_duplicate = False
        for existing_keywords in seen_keywords:
            if key_words and existing_keywords:
                overlap = len(key_words.intersection(existing_keywords)) / len(key_words.union(existing_keywords))
                if overlap > overlap_threshold:
                    is_duplicate = True
                    break
        
        if not is_duplicate and key_words:
            cleaned_criteria.append(criterion)
            seen_keywords.add(frozenset(key_words))
    
    # If we have good quality criteria, return them
    if len(cleaned_criteria) >= 3:
        return {
            'acceptance_criteria': cleaned_criteria[:5],  # Limit to 5 criteria
            'quality_validation': {
                'used_fallback': False,
                'quality_score': 0.8,
                'total_criteria': len(cleaned_criteria),
                'removed_duplicates': len(acceptance_criteria) - len(cleaned_criteria)
            }
        }
    
    # If quality is poor, use fallback but try to keep 1-2 good original criteria
    fallback_criteria = get_fallback_business_criteria(change_type, ticket_summary)
    
    # Combine best original with fallback, avoiding duplication
    final_criteria = []
    
    # Add up to 2 best original criteria
    for criterion in cleaned_criteria[:2]:
        final_criteria.append(criterion)
    
    # Add fallback criteria that don't duplicate existing ones
    for fallback in fallback_criteria:
        if len(final_criteria) >= 4:  # Limit total to 4
            break
            
        fallback_words = set(fallback.lower().split())
        is_duplicate = False
        
        for existing in final_criteria:
            existing_words = set(existing.lower().split())
            if fallback_words and existing_words:
                overlap = len(fallback_words.intersection(existing_words)) / len(fallback_words.union(existing_words))
                if overlap > 0.4:  # Lower threshold for fallback
                    is_duplicate = True
                    break
        
        if not is_duplicate:
            final_criteria.append(fallback)
    
    return {
        'acceptance_criteria': final_criteria,
        'quality_validation': {
            'used_fallback': True,
            'reason': f'Insufficient quality criteria: {len(cleaned_criteria)} good criteria found',
            'quality_score': len(cleaned_criteria) / max(1, len(acceptance_criteria)),
            'salvaged_count': len(cleaned_criteria),
            'fallback_count': len(final_criteria) - len(cleaned_criteria)
        }
    }

# Removed similar_criterion function - not needed for lightweight implementation

def generate_field_validation_fallback(ticket_summary: Dict[str, Any], change_type: str) -> Dict[str, Any]:
    """
    Generate proper field-by-field validation when AI response fails.
    This provides the helpful missing information feedback like the mock data used to do.
    """
    issues = []
    
    # Check required fields and provide specific feedback
    if not ticket_summary.get('requesterName', '').strip():
        issues.append({
            "field": "requesterName",
            "severity": "high",
            "note": "Requester name is required for ticket assignment and communication"
        })
    
    if not ticket_summary.get('changeType', '').strip():
        issues.append({
            "field": "changeType", 
            "severity": "high",
            "note": "Request type is required to determine review process and acceptance criteria"
        })
    
    if not ticket_summary.get('pageArea', '').strip():
        issues.append({
            "field": "pageArea",
            "severity": "high", 
            "note": "Impacted page area is required to understand implementation scope and impact"
        })
    
    if not ticket_summary.get('description', '').strip():
        issues.append({
            "field": "description",
            "severity": "high",
            "note": "Description is required to understand what needs to be implemented"
        })
    
    page_urls = ticket_summary.get('pageUrls', [])
    if not page_urls or not any(url.strip() for url in page_urls):
        issues.append({
            "field": "pageUrls",
            "severity": "med",
            "note": "Impacted page URLs help developers understand the implementation context"
        })
    
    if not ticket_summary.get('targetLaunchDate', '').strip():
        issues.append({
            "field": "targetLaunchDate",
            "severity": "high",
            "note": "Target go-live date is required for project planning and deployment scheduling"
        })
    
    # Change-type specific validation
    if change_type == "New Banner":
        copy_en = ticket_summary.get('copyEn', '').strip()
        copy_zh = ticket_summary.get('copyZh', '').strip()
        if not copy_en and not copy_zh:
            issues.append({
                "field": "copy",
                "severity": "med", 
                "note": "Banner copy content (English or Chinese) is needed for implementation"
            })
    
    elif change_type == "Content Update":
        copy_en = ticket_summary.get('copyEn', '').strip()
        copy_zh = ticket_summary.get('copyZh', '').strip()
        if not copy_en and not copy_zh:
            issues.append({
                "field": "copy",
                "severity": "high",
                "note": "Updated copy content is required for content change implementation"
            })
    
    elif change_type == "New Feature":
        if not ticket_summary.get('description', '').strip() or len(ticket_summary.get('description', '')) < 50:
            issues.append({
                "field": "description",
                "severity": "high",
                "note": "New features require detailed description of functionality and user interactions"
            })
        
        # Only add the friendly reminder if there are other issues (incomplete form)
        # If form is complete, let normal AI analysis handle it and add reminder there
        if issues:  # Only add reminder if there are already validation issues
            issues.append({
                "field": "internal_review",
                "severity": "low",
                "note": "Note: New Feature requests typically require additional technical documentation and internal review before implementation. Consider providing user workflows, wireframes, and integration details for smoother development."
            })
    
    # If no issues found, don't add any issues for New Feature (let normal AI analysis handle it)
    if not issues and change_type != "New Feature":
        issues.append({
            "field": "general",
            "severity": "low", 
            "note": "Form appears complete - ready for review"
        })
    
    # Generate appropriate fallback criteria
    fallback_criteria = get_fallback_business_criteria(change_type, ticket_summary)
    
    # Always approve - let the frontend handle validation display
    # High severity issues will still show as "Missing Information" in the UI
    decision = 'approve'
    
    return {
        "decision": decision,
        "issues": issues,
        "acceptanceCriteria": fallback_criteria,
        "confidence": 0.4
    }

def get_fallback_business_criteria(change_type: str, ticket_summary: Dict[str, Any] = None) -> List[str]:
    """
    Provide fallback business-focused acceptance criteria when AI analysis fails.
    Updated to be more contextual to the specific request.
    """
    if not ticket_summary:
        ticket_summary = {}
        
    page_area = ticket_summary.get('pageArea', 'specified page area')
    description = ticket_summary.get('description', 'described requirements')
    
    fallback_criteria = {
        "New Banner": [
            f"Implementation matches the specific requirements described: {description[:100]}{'...' if len(description) > 100 else ''}",
            f"Banner is properly integrated into the {page_area} as specified",
            f"Visual design supports the campaign objectives outlined in the request",
            f"Content presentation aligns with the provided specifications and timeline"
        ],
        "Content Update": [
            "Content aligns with brand voice and messaging guidelines",
            "Copy is clear, accurate, and effectively communicates intended message",
            "Updates maintain consistency with existing site content and style",
            "Localization maintains meaning and cultural appropriateness where applicable"
        ],
        "Bug Fix": [
            "Issue is resolved and expected functionality is restored",
            "Fix works consistently across different browsers and devices",
            "User experience is improved without introducing new problems",
            "Solution addresses root cause rather than just symptoms"
        ],
        "New Feature": [
            "Feature specification requires detailed user workflow documentation and wireframes",
            "Technical implementation approach and system architecture need comprehensive analysis",
            "Business value proposition and measurable success criteria must be clearly defined",
            "Integration points with existing systems require detailed planning and approval"
        ],
        "SEO Update": [
            "SEO improvements are implemented without breaking existing functionality",
            "Content structure supports search engine understanding",
            "User experience is maintained or enhanced alongside SEO benefits",
            "Technical SEO implementation follows current best practices"
        ]
    }
    
    base_criteria = fallback_criteria.get(change_type, [
        "Implementation meets business requirements and user needs",
        "Changes integrate well with existing functionality and workflows", 
        "User experience is maintained or improved",
        "Solution follows established design patterns and best practices"
    ])
    
    return base_criteria

def extract_user_context(event):
    """Extract user context from JWT claims in the event"""
    try:
        claims = event.get('requestContext', {}).get('authorizer', {}).get('jwt', {}).get('claims', {})
        if not claims:
            print('No JWT claims found in event requestContext')
            return None

        email = claims.get('email')
        user_id = claims.get('sub')
        username = claims.get('cognito:username') or claims.get('username')

        if not email or not user_id:
            print(f'Missing required JWT claims: email={bool(email)}, userId={bool(user_id)}')
            return None

        return {
            'email': email,
            'userId': user_id,
            'username': username or email.split('@')[0]  # fallback to email prefix if no username
        }
    except Exception as err:
        print(f'Error extracting user context from JWT: {err}')
        return None

def lambda_handler(event, context):
    """
    AI Preview Lambda - Real-time form analysis using Nova Lite
    Replaces mock AI preview with actual Bedrock Runtime API calls
    """
    try:
        # Extract user context from JWT claims - required for internal portal security
        user_context = extract_user_context(event)
        if not user_context:
            print('No JWT user context found in event')
            return {
                'statusCode': 401,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'WWW-Authenticate': 'Bearer realm="API"'
                },
                'body': json.dumps({
                    'error': 'unauthorized',
                    'message': 'Valid JWT token required'
                })
            }

        print(f"AI Preview request from authenticated user: email={user_context['email']}, userId={user_context['userId']}")

        # Parse request body
        if 'body' in event:
            body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
        else:
            body = event
        
        # Extract form data
        form_data = body.get('formData', {})
        
        # Create concise ticket summary for Nova Lite
        ticket_summary = {
            "requesterName": form_data.get('requesterName', ''),
            "changeType": form_data.get('changeType', ''),
            "pageArea": form_data.get('pageArea', ''),
            "description": form_data.get('description', ''),
            "pageUrls": form_data.get('pageUrls', []),
            "language": form_data.get('language', ''),
            "targetLaunchDate": form_data.get('targetLaunchDate', ''),
            "department": form_data.get('department', ''),
            "copyEn": form_data.get('copyEn', ''),
            "copyZh": form_data.get('copyZh', '')
        }
        
        # Policy bullets (based on actual /policies directory)
        policies = [
            "- Alt text is required for all marketing images (accessibility.md)",
            "- Hero images: Desktop ≥1440px width, 600-800px height. Mobile ≥750px width, ~1000px height (performance.md)",
            "- Image file size: Hero max 500KB, other images max 300KB (performance.md)", 
            "- Brand colors: Primary #5754FF, avoid off-palette colors except for banner images (brand.md)",
            "- Voice: Clear, concise, benefit-first. Avoid hype words like 'FREE!!!' (brand.md)",
            "- No ALL-CAPS headlines, use Title Case or Sentence case (brand.md)",
            "- Buttons: One primary CTA per view, min 44px touch height (design-system.md)",
            "- Mid-Autumn Festival exception: Traditional illustration and non-brand colors allowed for seasonal campaigns (brand.md)"
        ]
        
        # Get change-type-specific prompt template
        change_type = form_data.get('changeType', '')
        business_prompt = get_business_focused_prompt(change_type, ticket_summary, policies)
        
        # Prepare Nova Lite prompt with business focus
        messages = [
            {
                "role": "user",
                "content": business_prompt
            }
        ]
        
        # Add images if provided (limit to 1-2 key images for cost control)
        uploaded_assets = body.get('uploadedAssets', [])
        if uploaded_assets:
            # For MVP, we'll process image metadata only
            # In production, you'd fetch actual image bytes from S3
            image_details = []
            for asset in uploaded_assets[:2]:  # Limit to first 2 images
                filename = asset.get('filename', 'unknown')
                width = asset.get('width', 0)
                height = asset.get('height', 0)
                alt_text = asset.get('altText', '')
                img_type = asset.get('type', 'unknown')
                
                alt_status = f"Alt text provided: '{alt_text}'" if alt_text else "Alt text: NOT PROVIDED"
                image_details.append(f"{img_type.title()} image: {filename} ({width}x{height}px), {alt_status}")
            
            messages[0]["content"].append({
                "text": f"Uploaded Images:\n" + "\n".join(image_details)
            })
        
        # Call Nova Lite via Bedrock Runtime API
        response = bedrock_runtime.converse(
            modelId="amazon.nova-lite-v1:0",
            messages=messages,
            inferenceConfig={
                "maxTokens": 500,  # Increased to avoid truncation
                "temperature": 0.2,
                "topP": 0.9
            }
        )
        
        # Extract response text
        response_text = response['output']['message']['content'][0]['text']
        
        # Parse JSON response (handle markdown code blocks)
        try:
            # Remove markdown code blocks if present
            if response_text.startswith('```json'):
                response_text = response_text.replace('```json\n', '').replace('\n```', '').strip()
            elif response_text.startswith('```'):
                response_text = response_text.replace('```\n', '').replace('\n```', '').strip()
            
            ai_analysis = json.loads(response_text)
        except json.JSONDecodeError as e:
            print(f"JSON parsing error: {e}")
            print(f"Response text: {response_text}")
            # Fallback with proper field validation when AI response is malformed
            ai_analysis = generate_field_validation_fallback(ticket_summary, change_type)
        
        # Ensure required fields exist
        ai_analysis.setdefault('decision', 'approve')
        ai_analysis.setdefault('issues', [])
        ai_analysis.setdefault('acceptanceCriteria', [])
        ai_analysis.setdefault('confidence', 0.5)
        
        # HARDCODED: Always add New Feature reminder directly to Summary card (not as issue)
        if change_type == "New Feature":
            # Always add the reminder as a summary-level note (hardcoded, not AI-generated)
            # This will be displayed in the Summary card itself, not as a separate issue
            ai_analysis['summaryNote'] = "Note: New Feature requests typically require additional technical documentation and internal review before implementation. Consider providing user workflows, wireframes, and integration details for smoother development."
            
            # Check if there are any high-severity validation issues (missing required fields)
            has_high_severity_issues = any(
                issue.get('severity') == 'high' 
                for issue in ai_analysis.get('issues', [])
            )
            
            # For complete forms (no high-severity issues), clear AI issues completely
            if not has_high_severity_issues:
                ai_analysis['decision'] = 'approve'
                # Clear all issues so only Summary and Acceptance Criteria show
                ai_analysis['issues'] = []
            else:
                # For incomplete forms, keep validation issues
                # summaryNote will still be available for Summary card display
                pass
        
        # Apply simplified quality validation and filtering
        if ai_analysis.get('acceptanceCriteria'):
            # First filter out system-enforced items
            filtered_criteria = filter_system_enforced_items(
                ai_analysis['acceptanceCriteria'], 
                change_type
            )
            
            # Apply quality validation with deduplication
            quality_results = apply_quality_validation_and_fallback(filtered_criteria, change_type, ticket_summary)
            
            # Update acceptance criteria with quality-validated results
            ai_analysis['acceptanceCriteria'] = quality_results['acceptance_criteria']
            
            # Add minimal quality metadata (optional, for monitoring)
            if quality_results['quality_validation'].get('used_fallback'):
                ai_analysis['qualityNote'] = quality_results['quality_validation']['reason']
        
        # Return response for API Gateway
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': json.dumps(ai_analysis)
        }
        
    except Exception as e:
        print(f"Error in AI Preview Lambda with user context: {str(e)}")
        print(f"User context: {event.get('requestContext', {}).get('authorizer', {}).get('jwt', {}).get('claims', {}).get('email', 'unknown')}")
        print(f"Timestamp: {context.aws_request_id if context else 'unknown'}")
        
        # Return error response with business-focused fallback
        change_type = body.get('formData', {}).get('changeType', 'general')
        form_data = body.get('formData', {})
        ticket_summary = {
            "pageArea": form_data.get('pageArea', ''),
            "description": form_data.get('description', ''),
            "copyEn": form_data.get('copyEn', ''),
            "copyZh": form_data.get('copyZh', '')
        }
        fallback_criteria = get_fallback_business_criteria(change_type, ticket_summary)
        
        # Standard error handling with friendly New Feature reminder
        error_issues = [{"field": "general", "severity": "high", "note": "AI analysis temporarily unavailable - please review manually"}]
        
        # Add friendly reminder for New Feature requests
        if change_type == "New Feature":
            error_issues.append({
                "field": "internal_review", 
                "severity": "low", 
                "note": "Note: New Feature requests typically require additional technical documentation and internal review before implementation."
            })
        
        error_response = {
            "decision": "approve",
            "issues": error_issues,
            "acceptanceCriteria": fallback_criteria,
            "criteriaCategorization": categorize_criteria_by_type(fallback_criteria),
            "confidence": 0.0
        }
        
        # HARDCODED: Always add New Feature reminder to Summary card (even in error cases)
        if change_type == "New Feature":
            summary_reminder = {
                "field": "summary_note",
                "severity": "info",
                "note": "Note: New Feature requests typically require additional technical documentation and internal review before implementation. Consider providing user workflows, wireframes, and integration details for smoother development."
            }
            error_response['issues'].append(summary_reminder)
        
        return {
            'statusCode': 200,  # Return 200 to avoid frontend errors
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': json.dumps(error_response)
        }