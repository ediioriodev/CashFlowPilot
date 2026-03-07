-- Drop the old overloaded functions that cause ambiguity (the ones taking single text arguments instead of text[] arrays for p_ambito and p_negozio)

DROP FUNCTION IF EXISTS get_monthly_trend(text, bigint, uuid, date, date, text, text, text, boolean, boolean, uuid);
DROP FUNCTION IF EXISTS get_category_breakdown(text, bigint, uuid, date, date, text, text, text, boolean, boolean, uuid);
DROP FUNCTION IF EXISTS get_merchant_breakdown(text, bigint, uuid, date, date, text, text, text, boolean, boolean, uuid);
