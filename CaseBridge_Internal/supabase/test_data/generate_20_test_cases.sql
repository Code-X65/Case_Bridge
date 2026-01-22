-- ============================================================================
-- GENERATE 20 TEST CASES WITH PAYMENTS
-- ============================================================================
-- Firm ID: 00000000-0000-0000-0000-000000000001
-- Client User ID: 62f07e93-25ba-4d7c-afce-b0fe3de7263c
-- All cases in "Pending Review" status with completed payments
-- ============================================================================

DO $$
DECLARE
    v_firm_id UUID := '00000000-0000-0000-0000-000000000001';
    v_client_id UUID := '62f07e93-25ba-4d7c-afce-b0fe3de7263c';
    v_matter_id UUID;
    v_invoice_id UUID;
    v_payment_id UUID;
    v_case_number INT;
    v_case_types TEXT[] := ARRAY[
        'Contract Dispute',
        'Property Dispute',
        'Employment Termination',
        'Debt Recovery',
        'Landlord-Tenant Dispute',
        'Business Partnership Dispute',
        'Intellectual Property Infringement',
        'Personal Injury Claim',
        'Insurance Claim Dispute',
        'Consumer Rights Violation',
        'Breach of Contract',
        'Defamation Case',
        'Family Law Matter',
        'Estate Dispute',
        'Construction Dispute',
        'Medical Malpractice',
        'Product Liability',
        'Fraud Investigation',
        'Workplace Discrimination',
        'Wrongful Dismissal'
    ];
    v_descriptions TEXT[] := ARRAY[
        'Client alleges breach of contract terms by the defendant company.',
        'Dispute over property boundaries and ownership rights.',
        'Unfair termination without proper notice or severance pay.',
        'Outstanding debt collection from business transaction.',
        'Landlord failed to maintain property and return security deposit.',
        'Partnership dissolution and asset distribution disagreement.',
        'Unauthorized use of copyrighted material and trademark infringement.',
        'Injuries sustained due to negligence of third party.',
        'Insurance company denied legitimate claim without proper justification.',
        'Violation of consumer protection laws and unfair business practices.',
        'Failure to deliver goods/services as per contractual agreement.',
        'False statements causing damage to reputation and business.',
        'Child custody and support payment arrangements.',
        'Will contest and inheritance distribution issues.',
        'Contractor failed to complete work as per specifications.',
        'Medical negligence resulting in patient harm.',
        'Defective product caused injury to consumer.',
        'Investigation into fraudulent financial transactions.',
        'Discriminatory practices in workplace based on protected characteristics.',
        'Termination without just cause and proper procedure.'
    ];
    v_amounts DECIMAL[] := ARRAY[
        50000.00, 75000.00, 45000.00, 30000.00, 25000.00,
        100000.00, 60000.00, 80000.00, 55000.00, 40000.00,
        65000.00, 70000.00, 35000.00, 90000.00, 48000.00,
        52000.00, 68000.00, 42000.00, 58000.00, 72000.00
    ];
BEGIN
    -- Loop to create 20 cases
    FOR v_case_number IN 1..20 LOOP
        -- Generate unique matter ID
        v_matter_id := gen_random_uuid();
        v_invoice_id := gen_random_uuid();
        v_payment_id := gen_random_uuid();
        
        -- Insert Matter
        INSERT INTO public.matters (
            id,
            client_id,
            firm_id,
            title,
            description,
            status,
            matter_number,
            matter_type,
            service_tier,
            created_at,
            updated_at
        ) VALUES (
            v_matter_id,
            v_client_id,
            v_firm_id,
            v_case_types[v_case_number],
            v_descriptions[v_case_number],
            'Pending Review',
            'CASE-2026-' || LPAD(v_case_number::TEXT, 4, '0'),
            v_case_types[v_case_number],
            CASE 
                WHEN v_case_number % 3 = 0 THEN 'Expert'
                WHEN v_case_number % 2 = 0 THEN 'Priority'
                ELSE 'Standard'
            END,
            NOW() - (v_case_number || ' hours')::INTERVAL,
            NOW() - (v_case_number || ' hours')::INTERVAL
        );
        
        -- Insert Invoice
        INSERT INTO public.invoices (
            id,
            matter_id,
            client_id,
            amount,
            status,
            created_at
        ) VALUES (
            v_invoice_id,
            v_matter_id,
            v_client_id,
            v_amounts[v_case_number],
            'Paid',
            NOW() - (v_case_number || ' hours')::INTERVAL
        );
        
        -- Insert Payment
        INSERT INTO public.payments (
            id,
            invoice_id,
            matter_id,
            client_id,
            amount,
            status,
            created_at
        ) VALUES (
            v_payment_id,
            v_invoice_id,
            v_matter_id,
            v_client_id,
            v_amounts[v_case_number],
            'Success',
            NOW() - (v_case_number || ' hours')::INTERVAL
        );
        
        -- Insert initial case log
        INSERT INTO public.case_logs (
            matter_id,
            action,
            details,
            performed_by,
            created_at
        ) VALUES (
            v_matter_id,
            'case_created',
            jsonb_build_object(
                'matter_type', v_case_types[v_case_number],
                'initial_status', 'Pending Review',
                'payment_amount', v_amounts[v_case_number],
                'payment_status', 'Success',
                'service_tier', CASE 
                    WHEN v_case_number % 3 = 0 THEN 'Expert'
                    WHEN v_case_number % 2 = 0 THEN 'Priority'
                    ELSE 'Standard'
                END
            ),
            v_client_id,
            NOW() - (v_case_number || ' hours')::INTERVAL
        );
        
        -- Insert payment log
        INSERT INTO public.case_logs (
            matter_id,
            action,
            details,
            performed_by,
            created_at
        ) VALUES (
            v_matter_id,
            'payment_completed',
            jsonb_build_object(
                'invoice_id', v_invoice_id,
                'payment_id', v_payment_id,
                'amount', v_amounts[v_case_number],
                'status', 'Success'
            ),
            v_client_id,
            NOW() - (v_case_number || ' hours')::INTERVAL + INTERVAL '5 minutes'
        );
        
        RAISE NOTICE 'Created case % of 20: % (ID: %)', v_case_number, v_case_types[v_case_number], v_matter_id;
    END LOOP;
    
    RAISE NOTICE '✅ Successfully created 20 test cases with payments!';
    RAISE NOTICE 'Firm ID: %', v_firm_id;
    RAISE NOTICE 'Client ID: %', v_client_id;
    RAISE NOTICE 'All cases are in "Pending Review" status';
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- View all created cases
SELECT 
    matter_number,
    title,
    status,
    service_tier,
    matter_type,
    created_at
FROM public.matters
WHERE client_id = '62f07e93-25ba-4d7c-afce-b0fe3de7263c'
AND firm_id = '00000000-0000-0000-0000-000000000001'
ORDER BY created_at DESC;

-- View invoices and payment status
SELECT 
    m.matter_number,
    m.title,
    i.amount,
    i.status as invoice_status,
    p.status as payment_status,
    p.created_at as payment_date
FROM public.matters m
INNER JOIN public.invoices i ON i.matter_id = m.id
INNER JOIN public.payments p ON p.invoice_id = i.id
WHERE m.client_id = '62f07e93-25ba-4d7c-afce-b0fe3de7263c'
AND m.firm_id = '00000000-0000-0000-0000-000000000001'
ORDER BY m.created_at DESC;

-- Summary statistics
SELECT 
    COUNT(*) as total_cases,
    COUNT(DISTINCT i.id) as total_invoices,
    COUNT(DISTINCT p.id) as total_payments,
    SUM(p.amount) as total_amount_paid,
    AVG(p.amount) as average_payment
FROM public.matters m
LEFT JOIN public.invoices i ON i.matter_id = m.id
LEFT JOIN public.payments p ON p.invoice_id = i.id
WHERE m.client_id = '62f07e93-25ba-4d7c-afce-b0fe3de7263c'
AND m.firm_id = '00000000-0000-0000-0000-000000000001';

-- View case logs
SELECT 
    m.matter_number,
    m.title,
    cl.action,
    cl.details,
    cl.created_at
FROM public.case_logs cl
INNER JOIN public.matters m ON m.id = cl.matter_id
WHERE m.client_id = '62f07e93-25ba-4d7c-afce-b0fe3de7263c'
AND m.firm_id = '00000000-0000-0000-0000-000000000001'
ORDER BY cl.created_at DESC
LIMIT 50;
