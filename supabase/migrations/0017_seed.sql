-- ============================================================================
-- SetHub — 0017 SEED: institution directory + reference data
-- Safe to re-run.
-- ============================================================================

-- Platform-wide prefect position templates (institution_id null).
insert into institution_prefect_positions (institution_id, name, rank) values
  (null,'Head Boy',10), (null,'Head Girl',10), (null,'Senior Prefect',20),
  (null,'Assistant Senior Prefect',30), (null,'House Prefect',40),
  (null,'Class Prefect',50), (null,'Sports Prefect',60), (null,'Labour Prefect',70),
  (null,'Dining Hall Prefect',80), (null,'Chapel/Mosque Prefect',90),
  (null,'Health Prefect',100), (null,'Library Prefect',110),
  (null,'Social Prefect',120), (null,'Time Keeper',130), (null,'Other',999)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Institutions
-- ---------------------------------------------------------------------------
insert into institutions (name, slug, short_name, type, city, state, ownership, gender, residency,
                          has_houses, has_hostels, has_faculties, has_departments, has_prefects, status)
values
  -- Universities
  ('University of Lagos','university-of-lagos','UNILAG','university','Akoka','Lagos','federal',null,null,false,true,true,true,false,'verified'),
  ('University of Ibadan','university-of-ibadan','UI','university','Ibadan','Oyo','federal',null,null,false,true,true,true,false,'verified'),
  ('Obafemi Awolowo University','obafemi-awolowo-university','OAU','university','Ile-Ife','Osun','federal',null,null,false,true,true,true,false,'verified'),
  ('Ahmadu Bello University','ahmadu-bello-university','ABU','university','Zaria','Kaduna','federal',null,null,false,true,true,true,false,'verified'),
  ('University of Nigeria, Nsukka','university-of-nigeria-nsukka','UNN','university','Nsukka','Enugu','federal',null,null,false,true,true,true,false,'verified'),
  ('University of Benin','university-of-benin','UNIBEN','university','Benin City','Edo','federal',null,null,false,true,true,true,false,'verified'),
  ('University of Ilorin','university-of-ilorin','UNILORIN','university','Ilorin','Kwara','federal',null,null,false,true,true,true,false,'verified'),
  ('University of Port Harcourt','university-of-port-harcourt','UNIPORT','university','Port Harcourt','Rivers','federal',null,null,false,true,true,true,false,'verified'),
  ('Federal University of Technology, Akure','futa','FUTA','university','Akure','Ondo','federal',null,null,false,true,true,true,false,'verified'),
  ('Federal University of Technology, Minna','futminna','FUTMINNA','university','Minna','Niger','federal',null,null,false,true,true,true,false,'verified'),
  ('Lagos State University','lagos-state-university','LASU','university','Ojo','Lagos','state',null,null,false,true,true,true,false,'verified'),
  ('Covenant University','covenant-university','CU','university','Ota','Ogun','private',null,null,false,true,true,true,false,'verified'),
  ('Babcock University','babcock-university','BU','university','Ilishan-Remo','Ogun','private',null,null,false,true,true,true,false,'verified'),
  ('Nnamdi Azikiwe University','nnamdi-azikiwe-university','UNIZIK','university','Awka','Anambra','federal',null,null,false,true,true,true,false,'verified'),
  ('Bayero University Kano','bayero-university-kano','BUK','university','Kano','Kano','federal',null,null,false,true,true,true,false,'verified'),
  ('University of Calabar','university-of-calabar','UNICAL','university','Calabar','Cross River','federal',null,null,false,true,true,true,false,'verified'),
  ('University of Jos','university-of-jos','UNIJOS','university','Jos','Plateau','federal',null,null,false,true,true,true,false,'verified'),
  ('Ekiti State University','ekiti-state-university','EKSU','university','Ado-Ekiti','Ekiti','state',null,null,false,true,true,true,false,'verified'),
  -- Polytechnics
  ('Yaba College of Technology','yaba-college-of-technology','YABATECH','polytechnic','Yaba','Lagos','federal',null,null,false,true,true,true,false,'verified'),
  ('Federal Polytechnic, Ilaro','federal-polytechnic-ilaro','ILAROPOLY','polytechnic','Ilaro','Ogun','federal',null,null,false,true,true,true,false,'verified'),
  ('Lagos State Polytechnic','lagos-state-polytechnic','LASPOTECH','polytechnic','Ikorodu','Lagos','state',null,null,false,true,true,true,false,'verified'),
  ('Kaduna Polytechnic','kaduna-polytechnic','KADPOLY','polytechnic','Kaduna','Kaduna','federal',null,null,false,true,true,true,false,'verified'),
  ('Auchi Polytechnic','auchi-polytechnic','AUCHIPOLY','polytechnic','Auchi','Edo','federal',null,null,false,true,true,true,false,'verified'),
  -- Colleges of education
  ('Federal College of Education, Zaria','fce-zaria','FCE Zaria','college_of_education','Zaria','Kaduna','federal',null,null,false,true,true,true,false,'verified'),
  ('Adeniran Ogunsanya College of Education','aoce','AOCOED','college_of_education','Otto-Ijanikin','Lagos','state',null,null,false,true,true,true,false,'verified'),
  -- Secondary schools
  ('Federal Government College, Lagos','fgc-lagos','FGC Lagos','secondary_school','Ijanikin','Lagos','federal','mixed','boarding',true,true,false,false,true,'verified'),
  ('Kings College, Lagos','kings-college-lagos','KC','secondary_school','Lagos Island','Lagos','federal','boys','day_and_boarding',true,true,false,false,true,'verified'),
  ('Queens College, Lagos','queens-college-lagos','QC','secondary_school','Yaba','Lagos','federal','girls','day_and_boarding',true,true,false,false,true,'verified'),
  ('Federal Government College, Enugu','fgc-enugu','FGC Enugu','secondary_school','Enugu','Enugu','federal','mixed','boarding',true,true,false,false,true,'verified'),
  ('Federal Government College, Kaduna','fgc-kaduna','FGC Kaduna','secondary_school','Kaduna','Kaduna','federal','mixed','boarding',true,true,false,false,true,'verified'),
  ('Federal Government College, Ijanikin','fgc-ijanikin','FGGC Ijanikin','secondary_school','Ijanikin','Lagos','federal','girls','boarding',true,true,false,false,true,'verified'),
  ('Loyola Jesuit College','loyola-jesuit-college','LJC','secondary_school','Abuja','FCT','mission','mixed','boarding',true,true,false,false,true,'verified'),
  ('Christ the King College, Onitsha','ckc-onitsha','CKC','secondary_school','Onitsha','Anambra','mission','boys','day_and_boarding',true,true,false,false,true,'verified'),
  ('Mayflower School, Ikenne','mayflower-school-ikenne','Mayflower','secondary_school','Ikenne','Ogun','private','mixed','boarding',true,true,false,false,true,'verified'),
  ('St. Gregory''s College, Lagos','st-gregorys-college-lagos','SGC','secondary_school','Obalende','Lagos','mission','boys','day',true,false,false,false,true,'verified'),
  ('Government College, Ibadan','government-college-ibadan','GCI','secondary_school','Apata','Oyo','state','boys','boarding',true,true,false,false,true,'verified'),
  ('Igbobi College, Yaba','igbobi-college','Igbobi','secondary_school','Yaba','Lagos','mission','boys','day_and_boarding',true,true,false,false,true,'verified'),
  ('Command Secondary School, Ipaja','command-secondary-school-ipaja','CSS Ipaja','secondary_school','Ipaja','Lagos','federal','mixed','day_and_boarding',true,true,false,false,true,'verified'),
  ('Air Force Comprehensive School, Ibadan','afcs-ibadan','AFCS','secondary_school','Ibadan','Oyo','federal','mixed','boarding',true,true,false,false,true,'verified'),
  -- Technical
  ('Government Technical College, Agidingbi','gtc-agidingbi','GTC Agidingbi','technical_school','Ikeja','Lagos','state','mixed','day',false,false,false,true,true,'verified')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Faculties + departments for tertiary institutions (a sensible common core).
-- ---------------------------------------------------------------------------
do $$
declare
  inst record;
  fac record;
  v_fac_id uuid;
  faculties text[] := array['Arts','Science','Engineering','Social Sciences','Law',
                            'Education','Management Sciences','Environmental Sciences',
                            'Basic Medical Sciences','Clinical Sciences','Agriculture','Pharmacy'];
  f text;
  dept text;
  dept_map jsonb := jsonb_build_object(
    'Arts', jsonb_build_array('English','History & International Studies','Philosophy','Linguistics',
                              'Theatre Arts','Creative Arts','French','Religious Studies','Music'),
    'Science', jsonb_build_array('Computer Science','Mathematics','Physics','Chemistry','Biology',
                                 'Microbiology','Biochemistry','Botany','Zoology','Statistics','Geology'),
    'Engineering', jsonb_build_array('Chemical Engineering','Civil Engineering','Computer Engineering',
                                     'Electrical & Electronics Engineering','Mechanical Engineering',
                                     'Metallurgical & Materials Engineering','Systems Engineering',
                                     'Petroleum & Gas Engineering','Biomedical Engineering'),
    'Social Sciences', jsonb_build_array('Economics','Political Science','Sociology','Psychology',
                                         'Geography','Mass Communication','Social Work','International Relations'),
    'Law', jsonb_build_array('Private & Property Law','Public Law','Commercial & Industrial Law',
                             'Jurisprudence & International Law'),
    'Education', jsonb_build_array('Educational Administration','Adult Education','Human Kinetics & Health Education',
                                   'Science Education','Arts & Social Science Education','Educational Foundations'),
    'Management Sciences', jsonb_build_array('Accounting','Banking & Finance','Business Administration',
                                             'Insurance','Actuarial Science','Employment Relations & HRM','Marketing'),
    'Environmental Sciences', jsonb_build_array('Architecture','Building','Estate Management',
                                                'Quantity Surveying','Surveying & Geoinformatics','Urban & Regional Planning'),
    'Basic Medical Sciences', jsonb_build_array('Anatomy','Physiology','Medical Laboratory Science',
                                                'Nursing Science','Radiography','Physiotherapy'),
    'Clinical Sciences', jsonb_build_array('Medicine & Surgery','Dentistry','Community Health','Nursing'),
    'Agriculture', jsonb_build_array('Agricultural Economics','Animal Science','Crop Science',
                                     'Soil Science','Fisheries','Food Science & Technology'),
    'Pharmacy', jsonb_build_array('Pharmaceutical Chemistry','Pharmacology','Pharmaceutics','Clinical Pharmacy')
  );
begin
  for inst in select id, type from institutions where has_departments loop
    foreach f in array faculties loop
      insert into institution_faculties (institution_id, name)
      values (inst.id, f)
      on conflict (institution_id, name) do nothing;

      select id into v_fac_id from institution_faculties
       where institution_id = inst.id and name = f;

      for dept in select jsonb_array_elements_text(dept_map->f) loop
        insert into institution_departments (institution_id, faculty_id, name)
        values (inst.id, v_fac_id, dept)
        on conflict (institution_id, name) do nothing;
      end loop;
    end loop;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Houses & hostels for secondary schools.
-- ---------------------------------------------------------------------------
do $$
declare
  inst record;
  h record;
  houses jsonb := jsonb_build_array(
    jsonb_build_object('name','Red House','color','#D94F4F'),
    jsonb_build_object('name','Blue House','color','#1E88E5'),
    jsonb_build_object('name','Green House','color','#0F9D74'),
    jsonb_build_object('name','Yellow House','color','#F0C875'),
    jsonb_build_object('name','White House','color','#E4E1D4'),
    jsonb_build_object('name','Purple House','color','#6E6B8F'));
  hostels text[] := array['Hostel A','Hostel B','Hostel C','Hostel D',
                          'Junior Boys Hostel','Junior Girls Hostel',
                          'Senior Boys Hostel','Senior Girls Hostel'];
  hostel text;
  i int;
begin
  for inst in select id from institutions where has_houses loop
    for i in 0 .. jsonb_array_length(houses) - 1 loop
      insert into institution_houses (institution_id, name, color, sort_order)
      values (inst.id, houses->i->>'name', houses->i->>'color', i)
      on conflict (institution_id, name) do nothing;
    end loop;
  end loop;

  for inst in select id from institutions where has_hostels and type = 'secondary_school' loop
    foreach hostel in array hostels loop
      insert into institution_hostels (institution_id, name)
      values (inst.id, hostel) on conflict (institution_id, name) do nothing;
    end loop;
  end loop;

  for inst in select id from institutions where has_hostels and type <> 'secondary_school' loop
    foreach hostel in array array['Hall 1','Hall 2','Hall 3','Off-campus','Postgraduate Hall'] loop
      insert into institution_hostels (institution_id, name)
      values (inst.id, hostel) on conflict (institution_id, name) do nothing;
    end loop;
  end loop;
end $$;
