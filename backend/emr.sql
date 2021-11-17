create table if not exists emr (
    idx text primary key,
    hospital_code text not null,
    hospital_name text not null,
    emr_no text not null,
    personal_id text not null,
    fullname text not null,
    birth text not null,
    blood_type not null,
    rh_blood_type text not null,
    insurance text not null
);

