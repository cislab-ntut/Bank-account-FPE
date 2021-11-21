create table if not exists bank_account (
    idx text primary key,
    bank_code text not null,
    bank_name text not null,
    account_no text not null,
    personal_id text not null,
    fullname text not null,
    birth text not null,
    securities text not null,
    foreign_currency text not null
);

