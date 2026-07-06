-- Expand vendor_type enum to cover the full HR vendor stack.
-- The Benefits Broker scoring framework is the only one seeded for MVP;
-- the schema is ready for all others once Elevate publishes the methodology papers.
alter type vendor_type add value if not exists 'tpa';
alter type vendor_type add value if not exists 'pbm';
alter type vendor_type add value if not exists 'stop_loss';
alter type vendor_type add value if not exists 'payroll';
alter type vendor_type add value if not exists 'cobra_fsa_admin';
alter type vendor_type add value if not exists 'navigation_advocacy';
alter type vendor_type add value if not exists 'mental_health_eap';
alter type vendor_type add value if not exists 'captive_funding';
