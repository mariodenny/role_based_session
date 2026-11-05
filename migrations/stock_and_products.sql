CREATE TABLE products(     
id INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
sku VARCHAR(255) NOT null UNIQUE, -- AQ001, AQ002
price DOUBLE(8,2) NOT NULL,
p_name VARCHAR(255) NOT NULL DEFAULT "barang1",
stock INT(10) NULL DEFAULT 0
);                         
                           
CREATE TABLE stock_movement(
    id int AUTO_INCREMENT not null primary key,
    product_id int,
    user_id int,
    qty int(10) not null default 0,
    created_at datetime default CURRENT_TIMESTAMP,
    constraint fk_product foreign key (product_id) REFERENCES products(id),
    constraint fk_users foreign key (user_id) REFERENCES users(id)
);

