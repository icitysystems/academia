-- Academia Database Initialization Script
-- Creates separate databases for each environment on the shared Aurora instance
--
-- Run this script as the master user after deploying the SharedDatabaseStack:
--   psql -h <aurora-endpoint> -U postgres -f init-databases.sql
--
-- The master credentials can be retrieved from Secrets Manager:
--   aws secretsmanager get-secret-value --secret-id academia/shared/db-credentials

-- ============================================================================
-- Create databases for each environment
-- ============================================================================

-- Development 1
CREATE DATABASE academia_dev1;
COMMENT ON DATABASE academia_dev1 IS 'Academia Development Environment 1';

-- Development 2
CREATE DATABASE academia_dev2;
COMMENT ON DATABASE academia_dev2 IS 'Academia Development Environment 2';

-- Testing
CREATE DATABASE academia_testing;
COMMENT ON DATABASE academia_testing IS 'Academia Testing Environment';

-- Staging
CREATE DATABASE academia_staging;
COMMENT ON DATABASE academia_staging IS 'Academia Staging Environment';

-- Production
CREATE DATABASE academia_production;
COMMENT ON DATABASE academia_production IS 'Academia Production Environment';

-- ============================================================================
-- Create application users for each environment (optional, recommended for security)
-- ============================================================================

-- Dev1 user
CREATE USER academia_dev1_user WITH PASSWORD 'CHANGE_ME_DEV1';
GRANT ALL PRIVILEGES ON DATABASE academia_dev1 TO academia_dev1_user;

-- Dev2 user
CREATE USER academia_dev2_user WITH PASSWORD 'CHANGE_ME_DEV2';
GRANT ALL PRIVILEGES ON DATABASE academia_dev2 TO academia_dev2_user;

-- Testing user
CREATE USER academia_testing_user WITH PASSWORD 'CHANGE_ME_TESTING';
GRANT ALL PRIVILEGES ON DATABASE academia_testing TO academia_testing_user;

-- Staging user
CREATE USER academia_staging_user WITH PASSWORD 'CHANGE_ME_STAGING';
GRANT ALL PRIVILEGES ON DATABASE academia_staging TO academia_staging_user;

-- Production user
CREATE USER academia_production_user WITH PASSWORD 'CHANGE_ME_PRODUCTION';
GRANT ALL PRIVILEGES ON DATABASE academia_production TO academia_production_user;

-- ============================================================================
-- Grant schema permissions (run after connecting to each database)
-- ============================================================================

-- After this script, connect to each database and run:
-- GRANT ALL ON SCHEMA public TO academia_<env>_user;
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO academia_<env>_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO academia_<env>_user;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO academia_<env>_user;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO academia_<env>_user;

\echo 'Databases created successfully!'
\echo 'Remember to:'
\echo '1. Change the passwords for each user'
\echo '2. Store the credentials in Secrets Manager or environment variables'
\echo '3. Run Prisma migrations for each database'
